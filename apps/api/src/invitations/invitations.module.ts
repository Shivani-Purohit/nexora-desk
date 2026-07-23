import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { OrganizationRoleGuard } from '../organizations/guards/organization-role.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { InvitationAcceptanceController } from './invitation-acceptance.controller';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [PrismaModule, MailModule, AuthModule],
  controllers: [InvitationsController, InvitationAcceptanceController],
  providers: [InvitationsService, OrganizationRoleGuard],
  exports: [InvitationsService],
})
export class InvitationsModule {}
