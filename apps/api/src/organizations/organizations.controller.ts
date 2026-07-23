import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationRole } from '../generated/prisma/enums';
import { OrganizationRoles } from './decorators/organization-roles.decorator';
import { OrganizationRoleGuard } from './guards/organization-role.guard';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard, OrganizationRoleGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get(':organizationId')
  @OrganizationRoles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.AGENT,
    OrganizationRole.VIEWER,
  )
  getOrganization(
    @Param('organizationId', new ParseUUIDPipe())
    organizationId: string,
  ) {
    return this.organizationsService.getOrganization(organizationId);
  }

  @Get(':organizationId/members')
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  listMembers(
    @Param('organizationId', new ParseUUIDPipe())
    organizationId: string,
  ) {
    return this.organizationsService.listMembers(organizationId);
  }
}
