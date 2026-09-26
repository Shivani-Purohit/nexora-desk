import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ActivityType } from '../generated/prisma/enums';

@Injectable()
export class TicketCommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createComment(ticketId: string, authorId: string, dto: CreateCommentDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Save the comment to database
      const comment = await tx.ticketComment.create({
        data: {
          ticketId,
          authorId,
          message: dto.message,
          isInternal: dto.isInternal ?? false,
        },
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      // 2. Automatically log the comment inside the timeline activity
      const activity = await tx.ticketActivity.create({
        data: {
          ticketId,
          actorId: authorId,
          type: ActivityType.COMMENT_ADDED,
          commentId: comment.id,
          metadata: { isInternal: comment.isInternal },
        },
      });

      return { comment, activity };
    });
  }
}