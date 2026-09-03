import {
  INestApplication,
  ShutdownSignal,
  ValidationError,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import type { Express } from 'express';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { ErrorCode } from './common/errors/error-code';
import { ApplicationException } from './common/errors/application.exception';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

export interface HttpSecurityOptions {
  corsOrigins: string[];
  trustProxy: boolean;
}

export function validationExceptionFactory(
  errors: ValidationError[],
): ApplicationException {
  return new ApplicationException(
    400,
    ErrorCode.VALIDATION_ERROR,
    'Validation failed',
    errors.map(({ property, constraints, children }) => ({
      property,
      constraints: constraints ?? {},
      ...(children?.length ? { children } : {}),
    })),
  );
}

export function configureApplication(
  app: INestApplication,
  security: HttpSecurityOptions = { corsOrigins: [], trustProxy: false },
): void {
  app.enableShutdownHooks([ShutdownSignal.SIGTERM, ShutdownSignal.SIGINT]);
  const express = app.getHttpAdapter().getInstance() as Express;
  express.disable('x-powered-by');
  express.set('trust proxy', security.trustProxy);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  if (security.corsOrigins.length > 0) {
    app.enableCors({
      origin: security.corsOrigins.includes('*') ? '*' : security.corsOrigins,
      credentials: false,
    });
  }
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
}
