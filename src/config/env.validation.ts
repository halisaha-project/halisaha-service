export interface EnvironmentVariables {
  NODE_ENV?: string;
  PORT?: string;
  MONGODB_URI?: string;
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
  };
}
