import { Injectable } from '@nestjs/common';
import {
  EmailVerificationMessage,
  GroupInvitationMessage,
  MailService,
  PasswordResetMessage,
} from './mail.service';

export type DevelopmentMailMessage =
  | {
      type: 'email_verification';
      to: string;
      token: string;
      createdAt: string;
    }
  | {
      type: 'password_reset';
      to: string;
      token: string;
      createdAt: string;
    }
  | {
      type: 'group_invitation';
      to: string;
      token: string;
      groupName: string;
      createdAt: string;
    };

@Injectable()
export class DevelopmentMailService implements MailService {
  private readonly messages: DevelopmentMailMessage[] = [];

  async sendEmailVerification(
    message: EmailVerificationMessage,
  ): Promise<void> {
    this.messages.unshift({
      type: 'email_verification',
      to: message.recipientEmail,
      token: message.token,
      createdAt: new Date().toISOString(),
    });
  }

  async sendPasswordReset(message: PasswordResetMessage): Promise<void> {
    this.messages.unshift({
      type: 'password_reset',
      to: message.recipientEmail,
      token: message.token,
      createdAt: new Date().toISOString(),
    });
  }

  async sendGroupInvitation(message: GroupInvitationMessage): Promise<void> {
    this.messages.unshift({
      type: 'group_invitation',
      to: message.recipientEmail,
      token: message.token,
      groupName: message.groupName,
      createdAt: new Date().toISOString(),
    });
  }

  getMessages(): DevelopmentMailMessage[] {
    return this.messages.map((message) => ({ ...message }));
  }

  clearMessages(): void {
    this.messages.length = 0;
  }
}
