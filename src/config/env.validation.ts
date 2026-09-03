export interface EnvironmentVariables {
  NODE_ENV?: string;
  PORT?: string;
  MONGODB_URI?: string;
  JWT_ACCESS_SECRET?: string;
  JWT_ACCESS_EXPIRES_IN?: string;
  JWT_REFRESH_SECRET?: string;
  JWT_REFRESH_EXPIRES_IN?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  APP_NAME?: string;
  CORS_ORIGINS?: string;
  TRUST_PROXY?: string;
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

  const resendApiKey = optionalNonEmpty(
    config.RESEND_API_KEY,
    'RESEND_API_KEY',
  );
  const mailFrom = optionalNonEmpty(config.MAIL_FROM, 'MAIL_FROM');
  const appName = optionalNonEmpty(config.APP_NAME, 'APP_NAME') ?? 'Halisaha';
  const corsOrigins = parseCorsOrigins(config.CORS_ORIGINS);
  const trustProxy = parseBoolean(config.TRUST_PROXY, 'TRUST_PROXY');
  if (nodeEnv === 'production') {
    if (!resendApiKey)
      throw new Error('RESEND_API_KEY is required in production');
    if (!mailFrom) throw new Error('MAIL_FROM is required in production');
    if (!isMailFrom(mailFrom))
      throw new Error('MAIL_FROM must contain a valid email address');
    if (config.JWT_ACCESS_EXPIRES_IN === undefined)
      throw new Error('JWT_ACCESS_EXPIRES_IN is required in production');
    if (config.JWT_REFRESH_EXPIRES_IN === undefined)
      throw new Error('JWT_REFRESH_EXPIRES_IN is required in production');
    if (jwtAccessSecret.trim().length < 32)
      throw new Error(
        'JWT_ACCESS_SECRET must be at least 32 characters in production',
      );
    if (jwtRefreshSecret.trim().length < 32)
      throw new Error(
        'JWT_REFRESH_SECRET must be at least 32 characters in production',
      );
    if (jwtAccessSecret.trim() === jwtRefreshSecret.trim())
      throw new Error('JWT access and refresh secrets must be different');
    if (corsOrigins.length === 0)
      throw new Error('CORS_ORIGINS is required in production');
    if (corsOrigins.includes('*'))
      throw new Error('CORS_ORIGINS must not contain a wildcard in production');
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
    ...(resendApiKey ? { RESEND_API_KEY: resendApiKey } : {}),
    ...(mailFrom ? { MAIL_FROM: mailFrom } : {}),
    APP_NAME: appName,
    ...(corsOrigins.length ? { CORS_ORIGINS: corsOrigins.join(',') } : {}),
    TRUST_PROXY: String(trustProxy),
  };
}

export function parseCorsOrigins(value: unknown): string[] {
  if (value === undefined) return [];
  if (typeof value !== 'string') {
    throw new Error('CORS_ORIGINS must be a comma-separated string');
  }
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set(origins.map(normalizeOrigin))];
}

function normalizeOrigin(origin: string): string {
  if (origin === '*') return origin;
  try {
    const parsed = new URL(origin);
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error();
    }
    return parsed.origin;
  } catch {
    throw new Error(`CORS_ORIGINS contains an invalid origin: ${origin}`);
  }
}

export function parseBoolean(value: unknown, name: string): boolean {
  if (value === undefined) return false;
  if (typeof value !== 'string') {
    throw new Error(`${name} must be true or false`);
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new Error(`${name} must be true or false`);
}

function optionalNonEmpty(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function isMailFrom(value: string): boolean {
  return /^(?:[^<>]+<[^<>\s]+@[^<>\s]+>|[^<>\s]+@[^<>\s]+)$/.test(value);
}
