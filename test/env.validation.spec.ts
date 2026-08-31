import { validateEnvironment } from '../src/config/env.validation';

describe('environment validation', () => {
  it('applies development and port defaults', () => {
    expect(validateEnvironment({})).toEqual({
      NODE_ENV: 'development',
      PORT: '3000',
    });
  });

  it('accepts supported environments and valid ports', () => {
    expect(validateEnvironment({ NODE_ENV: 'test', PORT: '8080' })).toEqual({
      NODE_ENV: 'test',
      PORT: '8080',
    });
    expect(
      validateEnvironment({ NODE_ENV: 'production', PORT: '65535' }).PORT,
    ).toBe('65535');
  });

  it.each(['staging', '', 'dev'])(
    'rejects unsupported NODE_ENV: %s',
    (nodeEnv) => {
      expect(() => validateEnvironment({ NODE_ENV: nodeEnv })).toThrow(
        'Invalid NODE_ENV',
      );
    },
  );

  it.each(['0', '65536', '3.14', 'not-a-port'])(
    'rejects invalid PORT: %s',
    (port) => {
      expect(() => validateEnvironment({ PORT: port })).toThrow(
        'PORT must be an integer',
      );
    },
  );
});
