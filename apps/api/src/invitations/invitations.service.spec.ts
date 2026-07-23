import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OrganizationRole } from '../generated/prisma/enums';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { InvitationsService } from './invitations.service';

describe('InvitationsService', () => {
  const prisma = {
    organization: {
      findUnique: jest.fn(),
    },
    membership: {
      findFirst: jest.fn(),
    },
    invitation: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mailService = {
    sendInvitationEmail: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'INVITATION_EXPIRES_IN_HOURS') {
        return 72;
      }

      throw new Error(`Unexpected configuration key: ${key}`);
    }),
  };

  const jwtService = {
    signAsync: jest.fn(),
  };

  let service: InvitationsService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new InvitationsService(
      prisma as unknown as PrismaService,
      mailService as unknown as MailService,
      configService as unknown as ConfigService,
      jwtService as unknown as JwtService,
    );
  });

  it('creates an invitation and sends the raw token by email', async () => {
    const invitation = {
      id: 'invitation-id',
      email: 'agent@example.com',
      role: OrganizationRole.AGENT,
      expiresAt: new Date('2026-07-26T12:00:00.000Z'),
      createdAt: new Date('2026-07-23T12:00:00.000Z'),
    };

    prisma.organization.findUnique.mockResolvedValue({
      id: 'organization-id',
      name: 'Nexora',
      isActive: true,
    });
    prisma.membership.findFirst.mockResolvedValue(null);
    prisma.invitation.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({
      firstName: 'Arjun',
      lastName: 'Kalariya',
    });
    prisma.invitation.create.mockResolvedValue(invitation);
    mailService.sendInvitationEmail.mockResolvedValue(undefined);

    await expect(
      service.createInvitation('organization-id', 'inviter-id', {
        email: ' Agent@Example.com ',
        role: OrganizationRole.AGENT,
      }),
    ).resolves.toEqual(invitation);

    type InvitationCreateCall = {
      data: {
        organizationId: string;
        invitedById: string;
        email: string;
        role: OrganizationRole;
        tokenHash: string;
      };
    };

    type InvitationEmailCall = {
      email: string;
      organizationName: string;
      inviterName: string;
      token: string;
    };

    expect(prisma.invitation.create).toHaveBeenCalledTimes(1);
    expect(mailService.sendInvitationEmail).toHaveBeenCalledTimes(1);

    const createCalls = prisma.invitation.create.mock.calls as unknown as Array<
      [InvitationCreateCall]
    >;
    const emailCalls = mailService.sendInvitationEmail.mock
      .calls as unknown as Array<[InvitationEmailCall]>;

    const createCall = createCalls[0]?.[0];
    const emailCall = emailCalls[0]?.[0];

    expect(createCall).toBeDefined();
    expect(emailCall).toBeDefined();

    expect(createCall?.data.organizationId).toBe('organization-id');
    expect(createCall?.data.invitedById).toBe('inviter-id');
    expect(createCall?.data.email).toBe('agent@example.com');
    expect(createCall?.data.role).toBe(OrganizationRole.AGENT);
    expect(createCall?.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);

    expect(emailCall?.email).toBe('agent@example.com');
    expect(emailCall?.organizationName).toBe('Nexora');
    expect(emailCall?.inviterName).toBe('Arjun Kalariya');
    expect(emailCall?.token).toMatch(/^[a-f0-9]{64}$/);

    expect(emailCall?.token).not.toBe(createCall?.data.tokenHash);
  });

  it('rejects an invitation for an existing member', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      id: 'organization-id',
      name: 'Nexora',
      isActive: true,
    });
    prisma.membership.findFirst.mockResolvedValue({
      id: 'membership-id',
    });

    await expect(
      service.createInvitation('organization-id', 'inviter-id', {
        email: 'member@example.com',
        role: OrganizationRole.AGENT,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.invitation.create).not.toHaveBeenCalled();
    expect(mailService.sendInvitationEmail).not.toHaveBeenCalled();
  });

  it('removes the invitation if email delivery fails', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      id: 'organization-id',
      name: 'Nexora',
      isActive: true,
    });
    prisma.membership.findFirst.mockResolvedValue(null);
    prisma.invitation.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({
      firstName: 'Arjun',
      lastName: null,
    });
    prisma.invitation.create.mockResolvedValue({
      id: 'invitation-id',
      email: 'agent@example.com',
      role: OrganizationRole.AGENT,
      expiresAt: new Date(),
      createdAt: new Date(),
    });
    prisma.invitation.delete.mockResolvedValue({
      id: 'invitation-id',
    });
    mailService.sendInvitationEmail.mockRejectedValue(
      new Error('SMTP delivery failed'),
    );

    await expect(
      service.createInvitation('organization-id', 'inviter-id', {
        email: 'agent@example.com',
        role: OrganizationRole.AGENT,
      }),
    ).rejects.toThrow('SMTP delivery failed');

    expect(prisma.invitation.delete).toHaveBeenCalledWith({
      where: {
        id: 'invitation-id',
      },
    });
  });
});
