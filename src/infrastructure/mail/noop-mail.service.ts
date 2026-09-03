import { Injectable } from '@nestjs/common';
import {
  EmailVerificationMessage,
  GroupInvitationMessage,
  MailService,
  PasswordResetMessage,
} from './mail.service';

@Injectable()
export class NoopMailService implements MailService {
  sendEmailVerification(message: EmailVerificationMessage): Promise<void> {
    void message;
    return Promise.resolve();
  }

  sendPasswordReset(message: PasswordResetMessage): Promise<void> {
    void message;
    return Promise.resolve();
  }

  sendGroupInvitation(message: GroupInvitationMessage): Promise<void> {
    void message;
    return Promise.resolve();
  }
}
