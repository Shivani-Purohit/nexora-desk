import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { OrganizationRole } from '../generated/prisma/enums';
import { OrganizationRoles } from '../organizations/decorators/organization-roles.decorator';
import { OrganizationRoleGuard } from '../organizations/guards/organization-role.guard';
import {
  CreateTicketDto,
  ListTicketsQueryDto,
  UpdateTicketDto,
} from './dto';
import { TicketsService } from './tickets.service';

@Controller('organizations/:organizationId/tickets')
@UseGuards(JwtAuthGuard, OrganizationRoleGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @OrganizationRoles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.AGENT,
  )
  create(
    @Param('organizationId', new ParseUUIDPipe())
    organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.create(organizationId, user.id, dto);
  }

  @Get()
  @OrganizationRoles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.AGENT,
    OrganizationRole.VIEWER,
  )
  list(
    @Param('organizationId', new ParseUUIDPipe())
    organizationId: string,
    @Query() query: ListTicketsQueryDto,
  ) {
    return this.ticketsService.list(organizationId, query);
  }

  @Get(':ticketNumber')
  @OrganizationRoles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.AGENT,
    OrganizationRole.VIEWER,
  )
  getByNumber(
    @Param('organizationId', new ParseUUIDPipe())
    organizationId: string,
    @Param('ticketNumber', ParseIntPipe)
    ticketNumber: number,
  ) {
    return this.ticketsService.getByNumber(
      organizationId,
      ticketNumber,
    );
  }

  @Patch(':ticketNumber')
  @OrganizationRoles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.AGENT,
  )
  update(
    @Param('organizationId', new ParseUUIDPipe())
    organizationId: string,
    @Param('ticketNumber', ParseIntPipe)
    ticketNumber: number,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(
      organizationId,
      ticketNumber,
      dto,
    );
  }
}
