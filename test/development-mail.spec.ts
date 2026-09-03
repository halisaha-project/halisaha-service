import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DevelopmentMailController } from '../src/infrastructure/mail/development-mail.controller';
import { DevelopmentMailService } from '../src/infrastructure/mail/development-mail.service';
import { MailModule } from '../src/infrastructure/mail/mail.module';
import { MailService } from '../src/infrastructure/mail/mail.service';
import { NoopMailService } from '../src/infrastructure/mail/noop-mail.service';
import { ResendMailService } from '../src/infrastructure/mail/resend-mail.service';

describe('Development mail capture', () => {
  const compileMailModule = async (nodeEnv: string): Promise<TestingModule> =>
    Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              resendApiKey: 're_test_key',
              mailFrom: 'Halisaha <mail@example.com>',
              appName: 'Halisaha',
            }),
          ],
        }),
        MailModule.forRoot(nodeEnv),
      ],
    }).compile();

  it('uses the capture service and exposes its controller in development', async () => {
    const moduleRef = await compileMailModule('development');
    const mailService = moduleRef.get(MailService);
    const controller = moduleRef.get(DevelopmentMailController);

    expect(mailService).toBeInstanceOf(DevelopmentMailService);

    await mailService.sendEmailVerification({
      recipientEmail: 'verify@example.com',
      token: 'raw-verification-token',
    });
    await mailService.sendPasswordReset({
      recipientEmail: 'reset@example.com',
      token: 'raw-reset-token',
    });
    await mailService.sendGroupInvitation({
      recipientEmail: 'invite@example.com',
      groupName: 'Sunday Team',
      token: 'raw-invitation-token',
    });

    expect(controller.getMessages()).toEqual([
      expect.objectContaining({
        type: 'group_invitation',
        to: 'invite@example.com',
        token: 'raw-invitation-token',
        groupName: 'Sunday Team',
        createdAt: expect.any(String),
      }),
      expect.objectContaining({
        type: 'password_reset',
        to: 'reset@example.com',
        token: 'raw-reset-token',
        createdAt: expect.any(String),
      }),
      expect.objectContaining({
        type: 'email_verification',
        to: 'verify@example.com',
        token: 'raw-verification-token',
        createdAt: expect.any(String),
      }),
    ]);

    expect(controller.clearMessages()).toEqual({ cleared: true });
    expect(controller.getMessages()).toEqual([]);

    await moduleRef.close();
  });

  it('uses Resend and does not register the development endpoint in production', async () => {
    const moduleRef = await compileMailModule('production');

    expect(moduleRef.get(MailService)).toBeInstanceOf(ResendMailService);
    expect(() =>
      moduleRef.get(DevelopmentMailController, { strict: false }),
    ).toThrow();

    await moduleRef.close();
  });

  it('uses the no-op service and does not register the endpoint in tests', async () => {
    const moduleRef = await compileMailModule('test');
    const mailService = moduleRef.get(MailService);

    expect(mailService).toBeInstanceOf(NoopMailService);
    await expect(
      mailService.sendEmailVerification({
        recipientEmail: 'test@example.com',
        token: 'test-token',
      }),
    ).resolves.toBeUndefined();
    expect(() =>
      moduleRef.get(DevelopmentMailController, { strict: false }),
    ).toThrow();

    await moduleRef.close();
  });
});
