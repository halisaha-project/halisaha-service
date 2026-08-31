import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  sendEmailVerification(...message: [string, string]): Promise<void> {
    void message;
    return Promise.resolve();
  }

  sendPasswordReset(...message: [string, string]): Promise<void> {
    void message;
    return Promise.resolve();
  }
}
