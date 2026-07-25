import { Module } from '@nestjs/common';
import { OrganizationRoleGuard } from '../organizations/guards/organization-role.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [PrismaModule],
  controllers: [TicketsController],
  providers: [TicketsService, OrganizationRoleGuard],
  exports: [TicketsService],
})
export class TicketsModule {}
