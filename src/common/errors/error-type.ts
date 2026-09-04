import { HttpStatus } from '@nestjs/common';

export enum ErrorType {
  BadRequest = 'BAD_REQUEST',
  Unauthorized = 'UNAUTHORIZED',
  Forbidden = 'FORBIDDEN',
  NotFound = 'NOT_FOUND',
  Conflict = 'CONFLICT',
  UnprocessableEntity = 'UNPROCESSABLE_ENTITY',
  TooManyRequests = 'TOO_MANY_REQUESTS',
  InternalServerError = 'INTERNAL_SERVER_ERROR',
}

export function errorTypeForStatus(statusCode: number): ErrorType {
  switch (statusCode) {
    case HttpStatus.BAD_REQUEST:
      return ErrorType.BadRequest;
    case HttpStatus.UNAUTHORIZED:
      return ErrorType.Unauthorized;
    case HttpStatus.FORBIDDEN:
      return ErrorType.Forbidden;
    case HttpStatus.NOT_FOUND:
      return ErrorType.NotFound;
    case HttpStatus.CONFLICT:
      return ErrorType.Conflict;
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return ErrorType.UnprocessableEntity;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ErrorType.TooManyRequests;
    default:
      return statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
        ? ErrorType.InternalServerError
        : ErrorType.BadRequest;
  }
}
