import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityType } from '../generated/prisma/enums';

export interface UploadedFileType {
  filename: string;
  originalname: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAttachment(
    ticketId: string,
    file: UploadedFileType,
    uploadedById?: string,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const fileUrl = `/uploads/${file.filename}`;

    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.ticketAttachment.create({
        data: {
          ticketId,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          fileUrl,
        },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId,
          actorId: uploadedById ?? null,
          type: ActivityType.ATTACHMENT_ADDED,
          metadata: {
            fileName: attachment.fileName,
            fileSize: attachment.fileSize,
            fileUrl: attachment.fileUrl,
          },
        },
      });

      return attachment;
    });
  }

  async getTicketAttachments(ticketId: string) {
    return this.prisma.ticketAttachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
    });
  }
}