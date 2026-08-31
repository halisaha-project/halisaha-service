import {
  INestApplication,
  ValidationError,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ErrorCode } from './common/errors/error-code';
import { ApplicationException } from './common/errors/application.exception';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

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

export function configureApplication(app: INestApplication): void {
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
