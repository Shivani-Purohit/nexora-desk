import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

interface InvitationEmail {
  email: string;
  organizationName: string;
  inviterName: string;
  token: string;
  expiresAt: Date;
}

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly mailFrom: string;
  private readonly appUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.mailFrom = this.configService.getOrThrow<string>('MAIL_FROM');
    this.appUrl = this.configService
      .getOrThrow<string>('APP_URL')
      .replace(/\/+$/, '');

    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow<string>('SMTP_HOST'),
      port: this.configService.getOrThrow<number>('SMTP_PORT'),
      secure: this.configService.getOrThrow<boolean>('SMTP_SECURE'),
    });
  }

  async sendInvitationEmail({
    email,
    organizationName,
    inviterName,
    token,
    expiresAt,
  }: InvitationEmail): Promise<void> {
    const invitationUrl = `${this.appUrl}/accept-invitation?token=${encodeURIComponent(token)}`;

    await this.transporter.sendMail({
      from: this.mailFrom,
      to: email,
      subject: `You have been invited to ${organizationName}`,
      text: [
        `${inviterName} invited you to join ${organizationName} on Nexora Desk.`,
        '',
        `Accept your invitation: ${invitationUrl}`,
        '',
        `This invitation expires on ${expiresAt.toISOString()}.`,
        'If you were not expecting this invitation, you can ignore this email.',
      ].join('\n'),
      html: [
        `<p>${inviterName} invited you to join <strong>${organizationName}</strong> on Nexora Desk.</p>`,
        `<p><a href="${invitationUrl}">Accept invitation</a></p>`,
        `<p>This invitation expires on ${expiresAt.toISOString()}.</p>`,
        '<p>If you were not expecting this invitation, you can ignore this email.</p>',
      ].join(''),
    });
  }
}
