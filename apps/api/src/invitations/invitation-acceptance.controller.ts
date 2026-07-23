import { Body, Controller, Post } from '@nestjs/common';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
export class InvitationAcceptanceController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('accept')
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.invitationsService.acceptInvitation(dto);
  }
}
