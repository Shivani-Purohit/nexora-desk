import { IsEmail, IsIn } from 'class-validator';
import { OrganizationRole } from '../../generated/prisma/enums';

export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsIn([
    OrganizationRole.ADMIN,
    OrganizationRole.AGENT,
    OrganizationRole.VIEWER,
  ])
  role!: OrganizationRole;
}
