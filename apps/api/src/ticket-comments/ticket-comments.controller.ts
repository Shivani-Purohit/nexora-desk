import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { TicketCommentsService } from './ticket-comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('tickets/:ticketId/comments')
@UseGuards(JwtAuthGuard)
export class TicketCommentsController {
  constructor(private readonly commentsService: TicketCommentsService) {}

  @Post()
  async createComment(
    @Param('ticketId') ticketId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.createComment(ticketId, userId, dto);
  }
}