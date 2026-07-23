import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { UserStatus } from '../generated/prisma/enums';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async createInvitation(
    organizationId: string,
    invitedById: string,
    createInvitationDto: CreateInvitationDto,
  ) {
    const email = createInvitationDto.email.trim().toLowerCase();
    const now = new Date();

    const organization = await this.prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    if (!organization || !organization.isActive) {
      throw new NotFoundException('Organization was not found');
    }

    const existingMembership = await this.prisma.membership.findFirst({
      where: {
        organizationId,
        user: {
          email,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingMembership) {
      throw new ConflictException(
        'This user is already a member of the organization',
      );
    }

    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        organizationId,
        email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingInvitation) {
      throw new ConflictException(
        'An active invitation already exists for this email address',
      );
    }

    const inviter = await this.prisma.user.findUnique({
      where: {
        id: invitedById,
      },
      select: {
        firstName: true,
        lastName: true,
      },
    });

    if (!inviter) {
      throw new NotFoundException('Inviting user was not found');
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const expiryHours = this.configService.getOrThrow<number>(
      'INVITATION_EXPIRES_IN_HOURS',
    );

    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId,
        email,
        role: createInvitationDto.role,
        tokenHash,
        expiresAt,
        invitedById,
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const inviterName =
      [inviter.firstName, inviter.lastName].filter(Boolean).join(' ') ||
      'A Nexora Desk administrator';

    try {
      await this.mailService.sendInvitationEmail({
        email,
        organizationName: organization.name,
        inviterName,
        token,
        expiresAt,
      });
    } catch (error) {
      await this.prisma.invitation.delete({
        where: {
          id: invitation.id,
        },
      });

      throw error;
    }

    return invitation;
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const now = new Date();

    const invitation = await this.prisma.invitation.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
      },
    });

    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt <= now ||
      !invitation.organization.isActive
    ) {
      throw new BadRequestException(
        'Invitation is invalid, expired, or no longer available',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: invitation.email,
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        status: true,
      },
    });

    let passwordHash: string | undefined;

    if (existingUser?.passwordHash) {
      const passwordIsValid = await argon2.verify(
        existingUser.passwordHash,
        dto.password,
      );

      if (!passwordIsValid) {
        throw new UnauthorizedException(
          'The password for this account is incorrect',
        );
      }

      if (existingUser.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('This account is not active');
      }
    } else {
      if (!dto.firstName?.trim()) {
        throw new BadRequestException(
          'firstName is required when creating a new account',
        );
      }

      passwordHash = (await argon2.hash(dto.password)) as string;
    }

    const user = await this.prisma.$transaction(async (transaction) => {
      const accepted = await transaction.invitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          acceptedAt: now,
        },
      });

      if (accepted.count !== 1) {
        throw new ConflictException(
          'Invitation has already been used or is no longer available',
        );
      }

      let userId: string;

      if (existingUser?.passwordHash) {
        userId = existingUser.id;
      } else if (existingUser) {
        const updatedUser = await transaction.user.update({
          where: {
            id: existingUser.id,
          },
          data: {
            passwordHash,
            firstName: dto.firstName!.trim(),
            lastName: dto.lastName?.trim() || null,
            status: UserStatus.ACTIVE,
          },
          select: {
            id: true,
          },
        });

        userId = updatedUser.id;
      } else {
        const createdUser = await transaction.user.create({
          data: {
            email: invitation.email,
            passwordHash: passwordHash!,
            firstName: dto.firstName!.trim(),
            lastName: dto.lastName?.trim() || null,
            status: UserStatus.ACTIVE,
          },
          select: {
            id: true,
          },
        });

        userId = createdUser.id;
      }

      await transaction.membership.create({
        data: {
          userId,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      return transaction.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      });
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      user: {
        ...user,
        membership: {
          role: invitation.role,
          organization: invitation.organization,
        },
      },
      accessToken,
    };
  }

  async listInvitations(organizationId: string) {
    return this.prisma.invitation.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async revokeInvitation(organizationId: string, invitationId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
      },
      select: {
        id: true,
        acceptedAt: true,
        revokedAt: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation was not found');
    }

    if (invitation.acceptedAt) {
      throw new ConflictException('An accepted invitation cannot be revoked');
    }

    if (invitation.revokedAt) {
      throw new ConflictException('Invitation has already been revoked');
    }

    return this.prisma.invitation.update({
      where: {
        id: invitation.id,
      },
      data: {
        revokedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
