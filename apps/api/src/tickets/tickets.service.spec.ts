/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are typed as any. */
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  TicketCategory,
  TicketPriority,
  TicketSource,
  TicketStatus,
  UserStatus,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  const createdAt = new Date('2026-07-23T10:00:00.000Z');
  const updatedAt = new Date('2026-07-23T11:00:00.000Z');

  const ticket = {
    id: 'ticket-1',
    organizationId: 'organization-1',
    number: 1,
    subject: 'BAS-IP mobile calling issue',
    description: 'Mobile application is not receiving calls.',
    status: TicketStatus.OPEN,
    priority: TicketPriority.HIGH,
    source: TicketSource.MANUAL,
    category: TicketCategory.TROUBLESHOOTING,
    requesterName: 'Test Client',
    requesterEmail: 'client@example.com',
    requesterPhone: '+919876543210',
    createdById: 'user-1',
    assignedToId: 'user-2',
    resolvedAt: null,
    closedAt: null,
    createdAt,
    updatedAt,
    createdBy: {
      id: 'user-1',
      email: 'owner@nexora.test',
      firstName: 'Arjun',
      lastName: 'Kalariya',
    },
    assignedTo: {
      id: 'user-2',
      email: 'agent@nexora.test',
      firstName: 'Support',
      lastName: 'Agent',
    },
  };

  const transactionClient = {
    ticketCounter: {
      upsert: jest.fn(),
    },
    ticket: {
      create: jest.fn(),
    },
  };

  const prismaMock = {
    ticket: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    membership: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let service: TicketsService;

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock.$transaction.mockImplementation(
      (
        operation:
          | Promise<unknown>[]
          | ((transaction: typeof transactionClient) => Promise<unknown>),
      ) => {
        if (Array.isArray(operation)) {
          return Promise.all(operation);
        }

        return operation(transactionClient);
      },
    );

    service = new TicketsService(
      prismaMock as unknown as PrismaService,
    );
  });

  describe('create', () => {
    it('creates the first organization ticket with number 1', async () => {
      transactionClient.ticketCounter.upsert.mockResolvedValue({
        nextNumber: 2,
      });
      transactionClient.ticket.create.mockResolvedValue(ticket);

      await expect(
        service.create('organization-1', 'user-1', {
          subject: '  BAS-IP mobile calling issue  ',
          description: '  Mobile application is not receiving calls.  ',
          priority: TicketPriority.HIGH,
          source: TicketSource.MANUAL,
          category: TicketCategory.TROUBLESHOOTING,
          requesterName: '  Test Client  ',
          requesterEmail: '  CLIENT@EXAMPLE.COM  ',
          requesterPhone: '  +919876543210  ',
        }),
      ).resolves.toEqual(ticket);

      expect(
        transactionClient.ticketCounter.upsert,
      ).toHaveBeenCalledWith({
        where: {
          organizationId: 'organization-1',
        },
        create: {
          organizationId: 'organization-1',
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

      expect(transactionClient.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'organization-1',
            number: 1,
            subject: 'BAS-IP mobile calling issue',
            description: 'Mobile application is not receiving calls.',
            requesterName: 'Test Client',
            requesterEmail: 'client@example.com',
            requesterPhone: '+919876543210',
            createdById: 'user-1',
          }),
        }),
      );
    });

    it('validates an assigned agent before creating a ticket', async () => {
      prismaMock.membership.findUnique.mockResolvedValue({
        user: {
          status: UserStatus.ACTIVE,
        },
      });
      transactionClient.ticketCounter.upsert.mockResolvedValue({
        nextNumber: 8,
      });
      transactionClient.ticket.create.mockResolvedValue({
        ...ticket,
        number: 7,
      });

      await service.create('organization-1', 'user-1', {
        subject: 'Assigned support request',
        assignedToId: 'user-2',
      });

      expect(prismaMock.membership.findUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: 'user-2',
            organizationId: 'organization-1',
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

      expect(transactionClient.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            number: 7,
            assignedToId: 'user-2',
          }),
        }),
      );
    });

    it('rejects assignment to a non-member', async () => {
      prismaMock.membership.findUnique.mockResolvedValue(null);

      await expect(
        service.create('organization-1', 'user-1', {
          subject: 'Assigned support request',
          assignedToId: 'user-outside-organization',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Assigned user is not a member of this organization',
        ),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('rejects assignment to an inactive member', async () => {
      prismaMock.membership.findUnique.mockResolvedValue({
        user: {
          status: UserStatus.SUSPENDED,
        },
      });

      await expect(
        service.create('organization-1', 'user-1', {
          subject: 'Assigned support request',
          assignedToId: 'user-2',
        }),
      ).rejects.toThrow(
        new BadRequestException('Assigned user is not active'),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns filtered and paginated organization tickets', async () => {
      prismaMock.ticket.findMany.mockResolvedValue([ticket]);
      prismaMock.ticket.count.mockResolvedValue(21);

      await expect(
        service.list('organization-1', {
          status: TicketStatus.OPEN,
          priority: TicketPriority.HIGH,
          category: TicketCategory.TROUBLESHOOTING,
          search: '  mobile  ',
          page: 2,
          limit: 10,
        }),
      ).resolves.toEqual({
        items: [ticket],
        pagination: {
          page: 2,
          limit: 10,
          total: 21,
          totalPages: 3,
        },
      });

      expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'organization-1',
            status: TicketStatus.OPEN,
            priority: TicketPriority.HIGH,
            category: TicketCategory.TROUBLESHOOTING,
            OR: expect.arrayContaining([
              {
                subject: {
                  contains: 'mobile',
                  mode: 'insensitive',
                },
              },
            ]),
          }),
          orderBy: {
            createdAt: 'desc',
          },
          skip: 10,
          take: 10,
        }),
      );

      expect(prismaMock.ticket.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          organizationId: 'organization-1',
          status: TicketStatus.OPEN,
        }),
      });
    });
  });

  describe('getByNumber', () => {
    it('returns a ticket using its organization number', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(ticket);

      await expect(
        service.getByNumber('organization-1', 1),
      ).resolves.toEqual(ticket);

      expect(prismaMock.ticket.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId_number: {
              organizationId: 'organization-1',
              number: 1,
            },
          },
        }),
      );
    });

    it('rejects an unknown ticket number', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.getByNumber('organization-1', 999),
      ).rejects.toThrow(new NotFoundException('Ticket not found'));
    });
  });

  describe('update', () => {
    it('sets the resolution timestamp when resolving a ticket', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        status: TicketStatus.OPEN,
        resolvedAt: null,
      });
      prismaMock.ticket.update.mockResolvedValue({
        ...ticket,
        status: TicketStatus.RESOLVED,
      });

      await service.update('organization-1', 1, {
        status: TicketStatus.RESOLVED,
      });

      expect(prismaMock.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'ticket-1',
          },
          data: expect.objectContaining({
            status: TicketStatus.RESOLVED,
            resolvedAt: expect.any(Date),
            closedAt: null,
          }),
        }),
      );
    });

    it('preserves the resolution timestamp when closing a ticket', async () => {
      const resolvedAt = new Date('2026-07-23T12:00:00.000Z');

      prismaMock.ticket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        status: TicketStatus.RESOLVED,
        resolvedAt,
      });
      prismaMock.ticket.update.mockResolvedValue({
        ...ticket,
        status: TicketStatus.CLOSED,
        resolvedAt,
      });

      await service.update('organization-1', 1, {
        status: TicketStatus.CLOSED,
      });

      expect(prismaMock.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: TicketStatus.CLOSED,
            resolvedAt,
            closedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('rejects updates for an unknown ticket', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.update('organization-1', 999, {
          priority: TicketPriority.URGENT,
        }),
      ).rejects.toThrow(new NotFoundException('Ticket not found'));

      expect(prismaMock.ticket.update).not.toHaveBeenCalled();
    });
  });
});
