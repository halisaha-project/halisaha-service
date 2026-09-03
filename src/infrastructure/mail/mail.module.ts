import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { DevelopmentMailController } from './development-mail.controller';
import { DevelopmentMailService } from './development-mail.service';
import { MailService } from './mail.service';
import { NoopMailService } from './noop-mail.service';
import { ResendMailService } from './resend-mail.service';

@Global()
@Module({})
export class MailModule {
  static forRoot(
    nodeEnv = process.env.NODE_ENV ?? 'development',
  ): DynamicModule {
    if (nodeEnv === 'development') {
      return {
        module: MailModule,
        controllers: [DevelopmentMailController],
        providers: [
          DevelopmentMailService,
          {
            provide: MailService,
            useExisting: DevelopmentMailService,
          },
        ],
        exports: [MailService],
      };
    }

    if (nodeEnv === 'production') {
      const mailProvider: Provider = {
        provide: MailService,
        inject: [ConfigService],
        useFactory: (configService: ConfigService): MailService =>
          new ResendMailService(
            new Resend(configService.getOrThrow<string>('resendApiKey')),
            configService,
          ),
      };

      return {
        module: MailModule,
        imports: [ConfigModule],
        providers: [mailProvider],
        exports: [MailService],
      };
    }

    return {
      module: MailModule,
      providers: [
        NoopMailService,
        {
          provide: MailService,
          useExisting: NoopMailService,
        },
      ],
      exports: [MailService],
    };
  }
}
