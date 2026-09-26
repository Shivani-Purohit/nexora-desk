import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  TicketStatus,
  UserStatus,
} from '../generated/prisma/enums';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTicketDto,
  ListTicketsQueryDto,
  UpdateTicketDto,
} from './dto';

const ticketRelations = {
  customer: true,

  createdBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },

  assignedTo: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.TicketInclude;

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    createdById: string,
    dto: CreateTicketDto,
  ) {
    const subject = dto.subject.trim();

    if (dto.assignedToId) {
      await this.validateAssignee(organizationId, dto.assignedToId);
    }

    return this.prisma.$transaction(async (transaction) => {
      const counter = await transaction.ticketCounter.upsert({
        where: {
          organizationId,
        },
        create: {
          organizationId,
          nextNumber: 2,
        },
        update: {
          nextNumber: {
            increment: 1,
          },
        },
        select: {
          nextNumber: true,
        },
      });

      const ticketNumber = counter.nextNumber - 1;

      const ticket = await transaction.ticket.create({
        data: {
          organizationId,
          number: ticketNumber,
          subject,
          description: this.cleanOptionalText(dto.description),
          priority: dto.priority,
          source: dto.source,
          category: dto.category,
          customerId: dto.customerId,
          createdById,
          assignedToId: dto.assignedToId,
        },
        include: ticketRelations,
      });

      // Automatically log ticket creation activity
      await transaction.ticketActivity.create({
        data: {
          ticketId: ticket.id,
          actorId: createdById,
          type: ActivityType.SYSTEM_LOG,
          metadata: { action: 'TICKET_CREATED', number: ticket.number },
        },
      });

      return ticket;
    });
  }

  async list(
    organizationId: string,
    query: ListTicketsQueryDto,
  ) {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.TicketWhereInput = {
      organizationId,
      status: query.status,
      priority: query.priority,
      source: query.source,
      category: query.category,
      assignedToId: query.assignedToId,
      ...(search
        ? {
            OR: [
              {
                subject: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                customer: {
                  is: {
                    firstName: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                customer: {
                  is: {
                    email: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                customer: {
                  is: {
                    phone: {
                      contains: search,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        include: ticketRelations,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.ticket.count({
        where,
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getByNumber(
    organizationId: string,
    ticketNumber: number,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: {
        organizationId_number: {
          organizationId,
          number: ticketNumber,
        },
      },
      include: ticketRelations,
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async update(
    organizationId: string,
    ticketNumber: number,
    dto: UpdateTicketDto,
    actorId?: string,
  ) {
    const existingTicket = await this.prisma.ticket.findUnique({
      where: {
        organizationId_number: {
          organizationId,
          number: ticketNumber,
        },
      },
      select: {
        id: true,
        status: true,
        priority: true,
        assignedToId: true,
        resolvedAt: true,
      },
    });

    if (!existingTicket) {
      throw new NotFoundException('Ticket not found');
    }

    if (dto.assignedToId) {
      await this.validateAssignee(organizationId, dto.assignedToId);
    }

    const timestamps = this.getStatusTimestamps(
      existingTicket.status,
      existingTicket.resolvedAt,
      dto.status,
    );

    return this.prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.ticket.update({
        where: {
          id: existingTicket.id,
        },
        data: {
          subject: dto.subject?.trim(),
          description:
            dto.description === undefined
              ? undefined
              : this.cleanOptionalText(dto.description),
          status: dto.status,
          priority: dto.priority,
          source: dto.source,
          category: dto.category,
          customerId: dto.customerId,
          assignedToId: dto.assignedToId,
          ...timestamps,
        },
        include: ticketRelations,
      });

      // Automatically record activity logs for status / priority / assignee changes
      if (dto.status && dto.status !== existingTicket.status) {
        await tx.ticketActivity.create({
          data: {
            ticketId: existingTicket.id,
            actorId: actorId ?? null,
            type: ActivityType.STATUS_CHANGED,
            metadata: { from: existingTicket.status, to: dto.status },
          },
        });
      }

      if (dto.priority && dto.priority !== existingTicket.priority) {
        await tx.ticketActivity.create({
          data: {
            ticketId: existingTicket.id,
            actorId: actorId ?? null,
            type: ActivityType.PRIORITY_CHANGED,
            metadata: { from: existingTicket.priority, to: dto.priority },
          },
        });
      }

      if (dto.assignedToId !== undefined && dto.assignedToId !== existingTicket.assignedToId) {
        await tx.ticketActivity.create({
          data: {
            ticketId: existingTicket.id,
            actorId: actorId ?? null,
            type: ActivityType.ASSIGNMENT_CHANGED,
            metadata: { from: existingTicket.assignedToId, to: dto.assignedToId },
          },
        });
      }

      return updatedTicket;
    });
  }

  /**
   * Fetch complete timeline (Comments + System events) for a ticket
   */
  async getTicketTimeline(organizationId: string, ticketNumber: number) {
    const ticket = await this.getByNumber(organizationId, ticketNumber);

    return this.prisma.ticketActivity.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        comment: {
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });
  }

  private async validateAssignee(
    organizationId: string,
    assignedToId: string,
  ): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: assignedToId,
          organizationId,
        },
      },
      select: {
        user: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!membership) {
      throw new BadRequestException(
        'Assigned user is not a member of this organization',
      );
    }

    if (membership.user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Assigned user is not active');
    }
  }

  private cleanOptionalText(value?: string): string | undefined {
    const cleaned = value?.trim();

    return cleaned || undefined;
  }

  private getStatusTimestamps(
    currentStatus: TicketStatus,
    currentResolvedAt: Date | null,
    newStatus?: TicketStatus,
  ): {
    resolvedAt?: Date | null;
    closedAt?: Date | null;
  } {
    if (!newStatus || newStatus === currentStatus) {
      return {};
    }

    const now = new Date();

    if (newStatus === TicketStatus.RESOLVED) {
      return {
        resolvedAt: now,
        closedAt: null,
      };
    }

    if (newStatus === TicketStatus.CLOSED) {
      return {
        resolvedAt: currentResolvedAt ?? now,
        closedAt: now,
      };
    }

    return {
      resolvedAt: null,
      closedAt: null,
    };
  }
}