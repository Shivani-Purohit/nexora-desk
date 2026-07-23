import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { OrganizationRole, UserStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

describe('AuthService', () => {
  const createdAt = new Date('2026-07-23T00:00:00.000Z');

  const user = {
    id: 'user-1',
    email: 'owner@nexora.test',
    firstName: 'Arjun',
    lastName: 'Kalariya',
    status: UserStatus.ACTIVE,
    createdAt,
    memberships: [
      {
        role: OrganizationRole.OWNER,
        organization: {
          id: 'organization-1',
          name: 'Nexora Test',
          slug: 'nexora-test',
        },
      },
    ],
  };

  const loginUser = {
    ...user,
    passwordHash: 'hashed-password',
    memberships: [
      {
        role: OrganizationRole.OWNER,
        organization: {
          id: 'organization-1',
          name: 'Nexora Test',
          slug: 'nexora-test',
          isActive: true,
        },
      },
    ],
  };

  const transactionMock = {
    organization: {
      create: jest.fn(),
    },
    user: {
      create: jest.fn(),
    },
  };

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthService(
      prismaMock as unknown as PrismaService,
      jwtServiceMock as unknown as JwtService,
    );
  });

  describe('register', () => {
    const registerDto = {
      email: ' OWNER@NEXORA.TEST ',
      password: 'NexoraTest123',
      firstName: ' Arjun ',
      lastName: ' Kalariya ',
      organizationName: ' Nexora Test ',
      organizationSlug: ' NEXORA-TEST ',
    };

    it('creates an owner account and returns an access token', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.organization.findUnique.mockResolvedValue(null);
      transactionMock.organization.create.mockResolvedValue({
        id: 'organization-1',
      });
      transactionMock.user.create.mockResolvedValue(user);

      prismaMock.$transaction.mockImplementation(
        async (
          callback: (
            transaction: typeof transactionMock,
          ) => Promise<typeof user>,
        ) => callback(transactionMock),
      );

      jest.mocked(argon2.hash).mockResolvedValue('hashed-password');
      jwtServiceMock.signAsync.mockResolvedValue('access-token');

      const result = await service.register(registerDto);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'owner@nexora.test' },
      });

      expect(prismaMock.organization.findUnique).toHaveBeenCalledWith({
        where: { slug: 'nexora-test' },
      });

      expect(transactionMock.organization.create).toHaveBeenCalledWith({
        data: {
          name: 'Nexora Test',
          slug: 'nexora-test',
        },
      });

      expect(result).toEqual({
        user,
        accessToken: 'access-token',
      });
    });

    it('rejects an email that already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(user);
      prismaMock.organization.findUnique.mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('An account with this email already exists'),
      );
    });

    it('rejects an organization slug that already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.organization.findUnique.mockResolvedValue({
        id: 'organization-1',
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Organization slug is already in use'),
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: ' OWNER@NEXORA.TEST ',
      password: 'NexoraTest123',
    };

    it('returns the user and an access token for valid credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue(loginUser);
      jest.mocked(argon2.verify).mockResolvedValue(true);
      jwtServiceMock.signAsync.mockResolvedValue('access-token');

      const result = await service.login(loginDto);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'owner@nexora.test' },
        }),
      );

      expect(result.accessToken).toBe('access-token');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.email).toBe('owner@nexora.test');
    });

    it('rejects an unknown email address', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });

    it('rejects an incorrect password', async () => {
      prismaMock.user.findUnique.mockResolvedValue(loginUser);
      jest.mocked(argon2.verify).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });

    it('rejects an inactive account', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...loginUser,
        status: UserStatus.SUSPENDED,
      });
      jest.mocked(argon2.verify).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('This account is not active'),
      );
    });
  });

  describe('getProfile', () => {
    it('returns the requested user profile', async () => {
      prismaMock.user.findUnique.mockResolvedValue(loginUser);

      const result = await service.getProfile('user-1');

      expect(result).toEqual(loginUser);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
        }),
      );
    });

    it('rejects a profile request when the user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('missing-user')).rejects.toThrow(
        new UnauthorizedException('User account was not found'),
      );
    });
  });
});
