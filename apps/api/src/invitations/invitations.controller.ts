import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { OrganizationRole } from '../generated/prisma/enums';
import { OrganizationRoles } from '../organizations/decorators/organization-roles.decorator';
import { OrganizationRoleGuard } from '../organizations/guards/organization-role.guard';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationsService } from './invitations.service';

@Controller('organizations/:organizationId/invitations')
@UseGuards(JwtAuthGuard, OrganizationRoleGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  createInvitation(
    @Param('organizationId', new ParseUUIDPipe())
    organizationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createInvitationDto: CreateInvitationDto,
  ) {
    return this.invitationsService.createInvitation(
      organizationId,
      currentUser.id,
      createInvitationDto,
    );
  }

  @Get()
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  listInvitations(
    @Param('organizationId', new ParseUUIDPipe())
    organizationId: string,
  ) {
    return this.invitationsService.listInvitations(organizationId);
  }

  @Delete(':invitationId')
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  revokeInvitation(
    @Param('organizationId', new ParseUUIDPipe())
    organizationId: string,
    @Param('invitationId', new ParseUUIDPipe())
    invitationId: string,
  ) {
    return this.invitationsService.revokeInvitation(
      organizationId,
      invitationId,
    );
  }
}
