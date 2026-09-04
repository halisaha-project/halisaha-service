import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ResendClient,
  ResendMailService,
} from '../src/infrastructure/mail/resend-mail.service';

describe('Resend mail adapter', () => {
  const makeService = (send: jest.Mock) =>
    new ResendMailService(
      { emails: { send } } as ResendClient,
      {
        getOrThrow: jest.fn((key: string) =>
          key === 'mailFrom' ? 'Halisaha <mail@example.com>' : 'Halisaha',
        ),
      } as unknown as ConfigService,
    );

  it.each([
    {
      method: 'sendEmailVerification' as const,
      message: { recipientEmail: 'user@example.com', token: 'verify-token' },
      subject: 'Verify your email for Halisaha',
      content: 'verify-token',
    },
    {
      method: 'sendPasswordReset' as const,
      message: { recipientEmail: 'user@example.com', token: 'reset-token' },
      subject: 'Reset your Halisaha password',
      content: 'reset-token',
    },
    {
      method: 'sendGroupInvitation' as const,
      message: {
        recipientEmail: 'user@example.com',
        groupName: 'Sunday Team',
        token: 'invite-token',
        code: '004821',
      },
      subject: 'Invitation to join Sunday Team',
      content: '004821',
    },
  ])('sends the $method message through Resend', async (testCase) => {
    const send = jest
      .fn()
      .mockResolvedValue({ data: { id: 'email-id' }, error: null });
    const service = makeService(send);

    await service[testCase.method](testCase.message as never);

    expect(send).toHaveBeenCalledWith({
      from: 'Halisaha <mail@example.com>',
      to: 'user@example.com',
      subject: testCase.subject,
      html: expect.stringContaining(testCase.content),
    });
  });

  it.each([
    jest.fn().mockRejectedValue(new Error('secret provider details')),
    jest.fn().mockResolvedValue({ data: null, error: { message: 'rejected' } }),
  ])('handles provider failures without exposing details', async (send) => {
    const logger = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const service = makeService(send);

    await expect(
      service.sendPasswordReset({
        recipientEmail: 'user@example.com',
        token: 'raw-secret-token',
      }),
    ).resolves.toBeUndefined();
    expect(logger).toHaveBeenCalledWith('Transactional email delivery failed');
    expect(logger.mock.calls.flat().join(' ')).not.toContain(
      'raw-secret-token',
    );
    expect(logger.mock.calls.flat().join(' ')).not.toContain(
      'provider details',
    );
    logger.mockRestore();
  });
});
