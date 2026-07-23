import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationRoleGuard } from './organization-role.guard';

describe('OrganizationRoleGuard', () => {
  const prismaMock = {
    membership: {
      findUnique: jest.fn(),
    },
  };

  const reflectorMock = {
    getAllAndOverride: jest.fn(),
  };

  let guard: OrganizationRoleGuard;

  const createContext = (
    organizationId: string | undefined = 'organization-1',
  ) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: 'user-1',
            email: 'owner@nexora.test',
          },
          params: {
            organizationId,
          },
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();

    guard = new OrganizationRoleGuard(
      reflectorMock as unknown as Reflector,
      prismaMock as unknown as PrismaService,
    );
  });

  it('allows access when no organization roles are required', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);

    expect(prismaMock.membership.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a request without organization context', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue([OrganizationRole.OWNER]);

    await expect(guard.canActivate(createContext(''))).rejects.toThrow(
      new ForbiddenException('Organization context is required'),
    );
  });

  it('rejects a user who is not an organization member', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue([OrganizationRole.OWNER]);
    prismaMock.membership.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      new ForbiddenException('You do not have access to this organization'),
    );
  });

  it('rejects access to an inactive organization', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue([OrganizationRole.OWNER]);
    prismaMock.membership.findUnique.mockResolvedValue({
      role: OrganizationRole.OWNER,
      organization: {
        isActive: false,
      },
    });

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      new ForbiddenException('You do not have access to this organization'),
    );
  });

  it('rejects a member without the required role', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue([
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);
    prismaMock.membership.findUnique.mockResolvedValue({
      role: OrganizationRole.AGENT,
      organization: {
        isActive: true,
      },
    });

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      new ForbiddenException(
        'You do not have permission to perform this action',
      ),
    );
  });

  it('allows a member with the required role', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue([
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);
    prismaMock.membership.findUnique.mockResolvedValue({
      role: OrganizationRole.ADMIN,
      organization: {
        isActive: true,
      },
    });

    await expect(guard.canActivate(createContext())).resolves.toBe(true);

    expect(prismaMock.membership.findUnique).toHaveBeenCalledWith({
      where: {
        userId_organizationId: {
          userId: 'user-1',
          organizationId: 'organization-1',
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
  });
});
