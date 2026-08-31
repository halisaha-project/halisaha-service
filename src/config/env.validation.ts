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

  if (Number.isNaN(port) || port <= 0) {
    throw new Error('PORT must be a valid positive number');
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: String(port),
    MONGODB_URI: config.MONGODB_URI ? String(config.MONGODB_URI) : undefined,
  };
}
