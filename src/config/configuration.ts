import { parseBoolean, parseCorsOrigins } from './env.validation';

export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  mongodbUri: process.env.MONGODB_URI,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  resendApiKey: process.env.RESEND_API_KEY,
  mailFrom: process.env.MAIL_FROM,
  appName: process.env.APP_NAME ?? 'Halisaha',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  trustProxy: parseBoolean(process.env.TRUST_PROXY, 'TRUST_PROXY'),
});
