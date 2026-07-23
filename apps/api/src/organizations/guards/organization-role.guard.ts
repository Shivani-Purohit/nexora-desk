import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { OrganizationRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { ORGANIZATION_ROLES_KEY } from '../decorators/organization-roles.decorator';

type OrganizationRequest = Request & {
  user: AuthenticatedUser;
  params: {
    organizationId?: string;
  };
};

@Injectable()
export class OrganizationRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrganizationRole[]>(
      ORGANIZATION_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<OrganizationRequest>();
    const organizationId = request.params.organizationId;

    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: request.user.id,
          organizationId,
        },
      },
      select: {
        role: true,
        organization: {
          select: {
            isActive: true,
          },
        },
      },
    });

    if (!membership || !membership.organization.isActive) {
      throw new ForbiddenException(
        'You do not have access to this organization',
      );
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
