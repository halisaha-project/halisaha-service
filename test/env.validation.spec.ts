import { validateEnvironment } from '../src/config/env.validation';

describe('environment validation', () => {
  it('requires MONGODB_URI', () => {
    expect(() => validateEnvironment({})).toThrow('MONGODB_URI is required');
  });

  it('applies development and port defaults', () => {
    expect(
      validateEnvironment({
        MONGODB_URI: 'mongodb://localhost:27017/halisaha',
      }),
    ).toEqual({
      NODE_ENV: 'development',
      PORT: '3000',
      MONGODB_URI: 'mongodb://localhost:27017/halisaha',
    });
  });

  it('accepts supported environments and valid ports', () => {
    expect(
      validateEnvironment({
        NODE_ENV: 'test',
        PORT: '8080',
        MONGODB_URI: 'mongodb://localhost:27017/test',
      }),
    ).toEqual({
      NODE_ENV: 'test',
      PORT: '8080',
      MONGODB_URI: 'mongodb://localhost:27017/test',
    });
    expect(
      validateEnvironment({
        NODE_ENV: 'production',
        PORT: '65535',
        MONGODB_URI: 'mongodb+srv://cluster.example/test',
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
        }),
      ).toThrow('Invalid NODE_ENV');
    },
  );

  it.each(['0', '65536', '3.14', 'not-a-port'])(
    'rejects invalid PORT: %s',
    (port) => {
      expect(() =>
        validateEnvironment({
          PORT: port,
          MONGODB_URI: 'mongodb://localhost:27017/test',
        }),
      ).toThrow('PORT must be an integer');
    },
  );
});
