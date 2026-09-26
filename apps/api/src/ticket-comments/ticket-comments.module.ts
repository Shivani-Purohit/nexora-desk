import { Module } from '@nestjs/common';
import { TicketCommentsController } from './ticket-comments.controller';
import { TicketCommentsService } from './ticket-comments.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TicketCommentsController],
  providers: [TicketCommentsService],
  exports: [TicketCommentsService],
})
export class TicketCommentsModule {}