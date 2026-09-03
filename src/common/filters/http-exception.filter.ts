import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ErrorCode } from '../errors/error-code';

interface ErrorPayload {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    const request = host
      .switchToHttp()
      .getRequest<{ url: string; method: string }>();
    const payload = this.toPayload(exception, request);

    if (!(exception instanceof HttpException)) {
      this.logger.error('Unhandled application error');
    }

    response.status(payload.statusCode).json(payload);
  }

  private toPayload(
    exception: unknown,
    request: { url: string; method: string },
  ): ErrorPayload {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (this.isErrorPayload(body)) return body;
      if (statusCode === HttpStatus.NOT_FOUND) {
        return {
          statusCode,
          code: ErrorCode.NOT_FOUND,
          message: `Cannot ${request.method} ${request.url}`,
        };
      }
      if (statusCode === HttpStatus.TOO_MANY_REQUESTS) {
        return {
          statusCode,
          code: ErrorCode.RATE_LIMITED,
          message: 'Too many requests',
        };
      }

      const message = typeof body === 'string' ? body : this.httpMessage(body);
      return { statusCode, code: this.codeForStatus(statusCode), message };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }

  private isErrorPayload(value: unknown): value is ErrorPayload {
    return (
      typeof value === 'object' &&
      value !== null &&
      'statusCode' in value &&
      'code' in value &&
      'message' in value
    );
  }

  private httpMessage(value: object): string {
    const message = (value as { message?: string | string[] }).message;
    return Array.isArray(message)
      ? message.join(', ')
      : (message ?? 'Request failed');
  }

  private codeForStatus(statusCode: number): ErrorCode {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMITED;
      default:
        return statusCode >= 500
          ? ErrorCode.INTERNAL_SERVER_ERROR
          : ErrorCode.BAD_REQUEST;
    }
  }
}
