import {
  parseBoolean,
  parseCorsOrigins,
  validateEnvironment,
} from '../src/config/env.validation';

const productionEnvironment = {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb+srv://cluster.example/test',
  JWT_ACCESS_SECRET: 'access-secret-that-is-at-least-32-chars',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_SECRET: 'refresh-secret-that-is-at-least-32-chars',
  JWT_REFRESH_EXPIRES_IN: '30d',
  RESEND_API_KEY: 're_test_key',
  MAIL_FROM: 'App <mail@example.com>',
  CORS_ORIGINS: 'https://app.example.com',
};

describe('environment validation', () => {
  it('requires MONGODB_URI', () => {
    expect(() => validateEnvironment({})).toThrow('MONGODB_URI is required');
  });

  it('applies development and port defaults', () => {
    expect(
      validateEnvironment({
        MONGODB_URI: 'mongodb://localhost:27017/halisaha',
        JWT_ACCESS_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'refresh-test-secret',
      }),
    ).toEqual({
      NODE_ENV: 'development',
      PORT: '3000',
      MONGODB_URI: 'mongodb://localhost:27017/halisaha',
      JWT_ACCESS_SECRET: 'test-secret',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_SECRET: 'refresh-test-secret',
      JWT_REFRESH_EXPIRES_IN: '30d',
      APP_NAME: 'Halisaha',
      TRUST_PROXY: 'false',
    });
  });

  it('accepts supported environments and valid ports', () => {
    expect(
      validateEnvironment({
        NODE_ENV: 'test',
        PORT: '8080',
        MONGODB_URI: 'mongodb://localhost:27017/test',
        JWT_ACCESS_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'refresh-test-secret',
      }),
    ).toEqual({
      NODE_ENV: 'test',
      PORT: '8080',
      MONGODB_URI: 'mongodb://localhost:27017/test',
      JWT_ACCESS_SECRET: 'test-secret',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_SECRET: 'refresh-test-secret',
      JWT_REFRESH_EXPIRES_IN: '30d',
      APP_NAME: 'Halisaha',
      TRUST_PROXY: 'false',
    });
    expect(
      validateEnvironment({
        ...productionEnvironment,
        PORT: '65535',
      }).PORT,
    ).toBe('65535');
  });

  it.each(['staging', '', 'dev'])(
    'rejects unsupported NODE_ENV: %s',
    (nodeEnv) => {
      expect(() =>
        validateEnvironment({
          NODE_ENV: nodeEnv,
          MONGODB_URI: 'mongodb://localhost:27017/test',
          JWT_ACCESS_SECRET: 'test-secret',
          JWT_REFRESH_SECRET: 'refresh-test-secret',
        }),
      ).toThrow('Invalid NODE_ENV');
    },
  );

  it('allows missing mail configuration outside production', () => {
    expect(
      validateEnvironment({
        NODE_ENV: 'test',
        MONGODB_URI: 'mongodb://localhost:27017/test',
        JWT_ACCESS_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'refresh-test-secret',
      }),
    ).not.toHaveProperty('RESEND_API_KEY');
  });

  it.each([
    [{ MAIL_FROM: 'mail@example.com' }, 'RESEND_API_KEY'],
    [{ RESEND_API_KEY: 're_test_key' }, 'MAIL_FROM'],
  ])('requires complete mail configuration in production', (mail, missing) => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        RESEND_API_KEY: undefined,
        MAIL_FROM: undefined,
        ...mail,
      }),
    ).toThrow(`${missing} is required in production`);
  });

  it('rejects an invalid production sender address', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        MAIL_FROM: 'not-an-address',
      }),
    ).toThrow('MAIL_FROM must contain a valid email address');
  });

  it('normalizes and validates comma-separated CORS origins', () => {
    expect(
      parseCorsOrigins(
        ' https://app.example.com/, http://localhost:3001, ,https://app.example.com ',
      ),
    ).toEqual(['https://app.example.com', 'http://localhost:3001']);
    expect(() => parseCorsOrigins('https://example.com/path')).toThrow(
      'CORS_ORIGINS contains an invalid origin',
    );
  });

  it.each([undefined, 'false', ' FALSE '])(
    'defaults or parses TRUST_PROXY false: %s',
    (value) => expect(parseBoolean(value, 'TRUST_PROXY')).toBe(false),
  );

  it('parses TRUST_PROXY true and rejects other values', () => {
    expect(parseBoolean(' TRUE ', 'TRUST_PROXY')).toBe(true);
    expect(() => parseBoolean('yes', 'TRUST_PROXY')).toThrow(
      'TRUST_PROXY must be true or false',
    );
  });

  it.each([
    ['CORS_ORIGINS', { CORS_ORIGINS: undefined }],
    ['JWT_ACCESS_EXPIRES_IN', { JWT_ACCESS_EXPIRES_IN: undefined }],
    ['JWT_REFRESH_EXPIRES_IN', { JWT_REFRESH_EXPIRES_IN: undefined }],
  ])('requires %s in production', (name, override) => {
    expect(() =>
      validateEnvironment({ ...productionEnvironment, ...override }),
    ).toThrow(`${name} is required in production`);
  });

  it('rejects wildcard production CORS', () => {
    expect(() =>
      validateEnvironment({ ...productionEnvironment, CORS_ORIGINS: '*' }),
    ).toThrow('CORS_ORIGINS must not contain a wildcard in production');
  });

  it.each([{ JWT_ACCESS_SECRET: 'short' }, { JWT_REFRESH_SECRET: 'short' }])(
    'rejects short production JWT secrets',
    (override) => {
      expect(() =>
        validateEnvironment({ ...productionEnvironment, ...override }),
      ).toThrow('must be at least 32 characters in production');
    },
  );

  it('rejects equal production JWT secrets', () => {
    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        JWT_REFRESH_SECRET: productionEnvironment.JWT_ACCESS_SECRET,
      }),
    ).toThrow('JWT access and refresh secrets must be different');
  });

  it.each(['0', '65536', '3.14', 'not-a-port'])(
    'rejects invalid PORT: %s',
    (port) => {
      expect(() =>
        validateEnvironment({
          PORT: port,
          MONGODB_URI: 'mongodb://localhost:27017/test',
          JWT_ACCESS_SECRET: 'test-secret',
          JWT_REFRESH_SECRET: 'refresh-test-secret',
        }),
      ).toThrow('PORT must be an integer');
    },
  );
});
