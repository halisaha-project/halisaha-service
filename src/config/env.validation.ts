export interface EnvironmentVariables {
  NODE_ENV?: string;
  PORT?: string;
  MONGODB_URI?: string;
  JWT_ACCESS_SECRET?: string;
  JWT_ACCESS_EXPIRES_IN?: string;
  JWT_REFRESH_SECRET?: string;
  JWT_REFRESH_EXPIRES_IN?: string;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const nodeEnv = String(config.NODE_ENV ?? 'development');
  const port = Number(config.PORT ?? 3000);

  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV: ${nodeEnv}`);
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const mongodbUri = config.MONGODB_URI;
  if (typeof mongodbUri !== 'string' || mongodbUri.trim() === '') {
    throw new Error('MONGODB_URI is required');
  }

  const jwtAccessSecret = config.JWT_ACCESS_SECRET;
  if (typeof jwtAccessSecret !== 'string' || jwtAccessSecret.trim() === '') {
    throw new Error('JWT_ACCESS_SECRET is required');
  }

  const jwtAccessExpiresIn = config.JWT_ACCESS_EXPIRES_IN ?? '15m';
  if (
    typeof jwtAccessExpiresIn !== 'string' ||
    jwtAccessExpiresIn.trim() === ''
  ) {
    throw new Error('JWT_ACCESS_EXPIRES_IN must be a non-empty string');
  }

  const jwtRefreshSecret = config.JWT_REFRESH_SECRET;
  if (typeof jwtRefreshSecret !== 'string' || jwtRefreshSecret.trim() === '') {
    throw new Error('JWT_REFRESH_SECRET is required');
  }
  const jwtRefreshExpiresIn = config.JWT_REFRESH_EXPIRES_IN ?? '30d';
  if (
    typeof jwtRefreshExpiresIn !== 'string' ||
    jwtRefreshExpiresIn.trim() === ''
  ) {
    throw new Error('JWT_REFRESH_EXPIRES_IN must be a non-empty string');
  }

  try {
    const parsedUri = new URL(mongodbUri);
    if (!['mongodb:', 'mongodb+srv:'].includes(parsedUri.protocol)) {
      throw new Error();
    }
  } catch {
    throw new Error('MONGODB_URI must be a valid MongoDB URI');
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: String(port),
    MONGODB_URI: mongodbUri,
    JWT_ACCESS_SECRET: jwtAccessSecret,
    JWT_ACCESS_EXPIRES_IN: jwtAccessExpiresIn,
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    JWT_REFRESH_EXPIRES_IN: jwtRefreshExpiresIn,
  };
}
