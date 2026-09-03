import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { MailService } from './mail.service';
import { NoopMailService } from './noop-mail.service';
import { ResendMailService } from './resend-mail.service';

@Global()
@Module({
  providers: [
    {
      provide: MailService,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): MailService => {
        if (configService.get<string>('nodeEnv') !== 'production') {
          return new NoopMailService();
        }
        return new ResendMailService(
          new Resend(configService.getOrThrow<string>('resendApiKey')),
          configService,
        );
      },
    },
  ],
  exports: [MailService],
})
export class MailModule {}
