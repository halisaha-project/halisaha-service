import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailVerificationMessage,
  GroupInvitationMessage,
  MailService,
  PasswordResetMessage,
} from './mail.service';
import {
  emailVerificationTemplate,
  groupInvitationTemplate,
  passwordResetTemplate,
} from './mail.templates';

export const RESEND_CLIENT = Symbol('RESEND_CLIENT');

export interface ResendClient {
  emails: {
    send(message: {
      from: string;
      to: string;
      subject: string;
      html: string;
    }): Promise<{ error: unknown | null }>;
  };
}

@Injectable()
export class ResendMailService implements MailService {
  private readonly logger = new Logger(ResendMailService.name);
  private readonly from: string;
  private readonly appName: string;

  constructor(
    @Inject(RESEND_CLIENT) private readonly client: ResendClient,
    configService: ConfigService,
  ) {
    this.from = configService.getOrThrow<string>('mailFrom');
    this.appName = configService.getOrThrow<string>('appName');
  }

  async sendEmailVerification(
    message: EmailVerificationMessage,
  ): Promise<void> {
    await this.send({
      to: message.recipientEmail,
      subject: `Verify your email for ${this.appName}`,
      html: emailVerificationTemplate(this.appName, message.token),
    });
  }

  async sendPasswordReset(message: PasswordResetMessage): Promise<void> {
    await this.send({
      to: message.recipientEmail,
      subject: `Reset your ${this.appName} password`,
      html: passwordResetTemplate(this.appName, message.token),
    });
  }

  async sendGroupInvitation(message: GroupInvitationMessage): Promise<void> {
    await this.send({
      to: message.recipientEmail,
      subject: `Invitation to join ${message.groupName}`,
      html: groupInvitationTemplate(
        this.appName,
        message.groupName,
        message.code,
      ),
    });
  }

  private async send(message: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    try {
      const result = await this.client.emails.send({
        from: this.from,
        ...message,
      });
      if (result.error) throw new Error('Resend rejected the message');
    } catch {
      // Delivery is best-effort so provider failures do not alter public auth or
      // invitation contracts. Never log provider details or token-bearing HTML.
      this.logger.error('Transactional email delivery failed');
    }
  }
}
