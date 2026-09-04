import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApplicationException } from '../errors/application.exception';
import {
  ClientMessage,
  clientMessageForErrorType,
} from '../errors/client-message';
import { ErrorType, errorTypeForStatus } from '../errors/error-type';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

interface NormalizedError {
  statusCode: number;
  message: string;
  type: ErrorType;
  clientMessage: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const normalized = this.normalize(exception);
    const payload: ApiErrorResponse = {
      statusCode: normalized.statusCode,
      success: false,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
      data: null,
      error: {
        message: normalized.message,
        type: normalized.type,
        clientMessage: normalized.clientMessage,
      },
    };

    if (!(exception instanceof HttpException)) {
      this.logger.error('Unhandled application error');
    }

    response.status(normalized.statusCode).json(payload);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof ApplicationException) {
      return {
        statusCode: exception.getStatus(),
        message: exception.message,
        type: exception.type,
        clientMessage: exception.clientMessage,
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const type = errorTypeForStatus(statusCode);
      return {
        statusCode,
        message:
          statusCode === HttpStatus.TOO_MANY_REQUESTS
            ? 'Too many requests'
            : this.httpMessage(exception.getResponse()),
        type,
        clientMessage: clientMessageForErrorType(type),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      type: ErrorType.InternalServerError,
      clientMessage: ClientMessage.InternalServerError,
    };
  }

  private httpMessage(value: string | object): string {
    if (typeof value === 'string') return value;
    const message = (value as { message?: string | string[] }).message;
    return Array.isArray(message)
      ? message.join(', ')
      : (message ?? 'Request failed');
  }
}
