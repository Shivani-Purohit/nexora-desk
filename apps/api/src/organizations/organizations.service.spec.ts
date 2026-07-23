import { NotFoundException } from '@nestjs/common';
import { OrganizationRole, UserStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  const createdAt = new Date('2026-07-23T00:00:00.000Z');
  const updatedAt = new Date('2026-07-23T01:00:00.000Z');

  const organization = {
    id: 'organization-1',
    name: 'Nexora Test',
    slug: 'nexora-test',
    isActive: true,
    createdAt,
    updatedAt,
  };

  const members = [
    {
      id: 'membership-1',
      role: OrganizationRole.OWNER,
      createdAt,
      updatedAt,
      user: {
        id: 'user-1',
        email: 'owner@nexora.test',
        firstName: 'Arjun',
        lastName: 'Kalariya',
        status: UserStatus.ACTIVE,
      },
    },
  ];

  const prismaMock = {
    organization: {
      findUnique: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
    },
  };

  let service: OrganizationsService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new OrganizationsService(prismaMock as unknown as PrismaService);
  });

  describe('getOrganization', () => {
    it('returns the requested organization', async () => {
      prismaMock.organization.findUnique.mockResolvedValue(organization);

      await expect(service.getOrganization('organization-1')).resolves.toEqual(
        organization,
      );

      expect(prismaMock.organization.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'organization-1',
        },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('rejects a request for an unknown organization', async () => {
      prismaMock.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.getOrganization('missing-organization'),
      ).rejects.toThrow(new NotFoundException('Organization was not found'));
    });
  });

  describe('listMembers', () => {
    it('returns organization members in creation order', async () => {
      prismaMock.membership.findMany.mockResolvedValue(members);

      await expect(service.listMembers('organization-1')).resolves.toEqual(
        members,
      );

      expect(prismaMock.membership.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'organization-1',
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              status: true,
            },
          },
        },
      });
    });
  });
});
