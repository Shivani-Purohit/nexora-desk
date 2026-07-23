import { SetMetadata } from '@nestjs/common';
import { OrganizationRole } from '../../generated/prisma/enums';

export const ORGANIZATION_ROLES_KEY = 'organizationRoles';

export const OrganizationRoles = (...roles: OrganizationRole[]) =>
  SetMetadata(ORGANIZATION_ROLES_KEY, roles);
