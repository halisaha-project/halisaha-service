export interface EmailVerificationMessage {
  recipientEmail: string;
  token: string;
}

export interface PasswordResetMessage {
  recipientEmail: string;
  token: string;
}

export interface GroupInvitationMessage {
  recipientEmail: string;
  groupName: string;
  token: string;
  code: string;
}

export abstract class MailService {
  abstract sendEmailVerification(
    message: EmailVerificationMessage,
  ): Promise<void>;

  abstract sendPasswordReset(message: PasswordResetMessage): Promise<void>;

  abstract sendGroupInvitation(message: GroupInvitationMessage): Promise<void>;
}
