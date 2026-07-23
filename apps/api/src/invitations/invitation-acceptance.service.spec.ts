import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { OrganizationRole, UserStatus } from '../generated/prisma/enums';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { InvitationsService } from './invitations.service';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

describe('InvitationsService invitation acceptance', () => {
  const transaction = {
    invitation: {
      updateMany: jest.fn(),
    },
    user: {
      create: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    membership: {
      create: jest.fn(),
    },
  };

  const prisma = {
    invitation: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  };

  const mailService = {
    sendInvitationEmail: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn(),
  };

  const validInvitation = {
    id: 'invitation-id',
    email: 'agent@example.com',
    role: OrganizationRole.AGENT,
    organizationId: 'organization-id',
    expiresAt: new Date('2099-07-26T12:00:00.000Z'),
    acceptedAt: null,
    revokedAt: null,
    organization: {
      id: 'organization-id',
      name: 'Nexora',
      slug: 'nexora',
      isActive: true,
    },
  };

  const acceptedUser = {
    id: 'user-id',
    email: 'agent@example.com',
    firstName: 'Arjun',
    lastName: 'Kalariya',
    status: UserStatus.ACTIVE,
  };

  let service: InvitationsService;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma.invitation.findUnique.mockResolvedValue(validInvitation);
    prisma.user.findUnique.mockResolvedValue(null);
    transaction.invitation.updateMany.mockResolvedValue({ count: 1 });
    transaction.user.create.mockResolvedValue({ id: 'user-id' });
    transaction.user.findUniqueOrThrow.mockResolvedValue(acceptedUser);
    transaction.membership.create.mockResolvedValue({
      id: 'membership-id',
    });
    jwtService.signAsync.mockResolvedValue('signed-access-token');

    jest.mocked(argon2.hash).mockResolvedValue('hashed-password');
    jest.mocked(argon2.verify).mockResolvedValue(true);

    service = new InvitationsService(
      prisma as unknown as PrismaService,
      mailService as unknown as MailService,
      configService as unknown as ConfigService,
      jwtService as unknown as JwtService,
    );
  });

  it('accepts an invitation and creates a new active user', async () => {
    await expect(
      service.acceptInvitation({
        token: 'raw-invitation-token',
        password: 'StrongPassword123!',
        firstName: ' Arjun ',
        lastName: ' Kalariya ',
      }),
    ).resolves.toEqual({
      user: {
        ...acceptedUser,
        membership: {
          role: OrganizationRole.AGENT,
          organization: validInvitation.organization,
        },
      },
      accessToken: 'signed-access-token',
    });

    expect(argon2.hash).toHaveBeenCalledWith('StrongPassword123!');

    expect(transaction.user.create).toHaveBeenCalledWith({
      data: {
        email: 'agent@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Arjun',
        lastName: 'Kalariya',
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    expect(transaction.membership.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-id',
        organizationId: 'organization-id',
        role: OrganizationRole.AGENT,
      },
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-id',
      email: 'agent@example.com',
    });
  });

  it('accepts an invitation for an existing active user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'existing-user-id',
      email: 'agent@example.com',
      passwordHash: 'existing-password-hash',
      status: UserStatus.ACTIVE,
    });

    transaction.user.findUniqueOrThrow.mockResolvedValue({
      ...acceptedUser,
      id: 'existing-user-id',
    });

    await service.acceptInvitation({
      token: 'raw-invitation-token',
      password: 'ExistingPassword123!',
    });

    expect(argon2.verify).toHaveBeenCalledWith(
      'existing-password-hash',
      'ExistingPassword123!',
    );
    expect(transaction.user.create).not.toHaveBeenCalled();
    expect(transaction.user.update).not.toHaveBeenCalled();

    expect(transaction.membership.create).toHaveBeenCalledWith({
      data: {
        userId: 'existing-user-id',
        organizationId: 'organization-id',
        role: OrganizationRole.AGENT,
      },
    });
  });

  it('rejects an incorrect password for an existing user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'existing-user-id',
      email: 'agent@example.com',
      passwordHash: 'existing-password-hash',
      status: UserStatus.ACTIVE,
    });
    jest.mocked(argon2.verify).mockResolvedValue(false);

    await expect(
      service.acceptInvitation({
        token: 'raw-invitation-token',
        password: 'WrongPassword123!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', null],
    [
      'expired',
      {
        ...validInvitation,
        expiresAt: new Date('2000-01-01T00:00:00.000Z'),
      },
    ],
    [
      'revoked',
      {
        ...validInvitation,
        revokedAt: new Date(),
      },
    ],
    [
      'already accepted',
      {
        ...validInvitation,
        acceptedAt: new Date(),
      },
    ],
    [
      'inactive organization',
      {
        ...validInvitation,
        organization: {
          ...validInvitation.organization,
          isActive: false,
        },
      },
    ],
  ])('rejects a %s invitation', async (_scenario, invitation) => {
    prisma.invitation.findUnique.mockResolvedValue(invitation);

    await expect(
      service.acceptInvitation({
        token: 'raw-invitation-token',
        password: 'StrongPassword123!',
        firstName: 'Arjun',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('requires a first name when creating a new account', async () => {
    await expect(
      service.acceptInvitation({
        token: 'raw-invitation-token',
        password: 'StrongPassword123!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(argon2.hash).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('activates an existing invited user without a password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'invited-user-id',
      email: 'agent@example.com',
      passwordHash: null,
      status: UserStatus.INVITED,
    });
    transaction.user.update.mockResolvedValue({
      id: 'invited-user-id',
    });
    transaction.user.findUniqueOrThrow.mockResolvedValue({
      ...acceptedUser,
      id: 'invited-user-id',
    });

    await service.acceptInvitation({
      token: 'raw-invitation-token',
      password: 'StrongPassword123!',
      firstName: ' Arjun ',
      lastName: ' Kalariya ',
    });

    expect(transaction.user.update).toHaveBeenCalledWith({
      where: {
        id: 'invited-user-id',
      },
      data: {
        passwordHash: 'hashed-password',
        firstName: 'Arjun',
        lastName: 'Kalariya',
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    expect(transaction.user.create).not.toHaveBeenCalled();
  });

  it('prevents reuse when the atomic invitation update loses the race', async () => {
    transaction.invitation.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.acceptInvitation({
        token: 'raw-invitation-token',
        password: 'StrongPassword123!',
        firstName: 'Arjun',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(transaction.user.create).not.toHaveBeenCalled();
    expect(transaction.membership.create).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});
