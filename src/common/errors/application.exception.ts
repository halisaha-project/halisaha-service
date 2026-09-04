import { HttpException } from '@nestjs/common';
import { ClientMessage, clientMessageForErrorType } from './client-message';
import { ErrorCode } from './error-code';
import { ErrorType, errorTypeForStatus } from './error-type';

export interface ApplicationExceptionOptions {
  statusCode: number;
  message: string;
  clientMessage: ClientMessage | string;
  type?: ErrorType;
  code?: ErrorCode;
  details?: unknown;
}

function legacyOptions(
  statusCode: number,
  code?: ErrorCode,
  message?: string,
  details?: unknown,
  clientMessage?: ClientMessage | string,
  type?: ErrorType,
): ApplicationExceptionOptions {
  const resolvedType = type ?? errorTypeForStatus(statusCode);
  return {
    statusCode,
    code,
    message: message ?? 'Request failed',
    details,
    type: resolvedType,
    clientMessage: clientMessage ?? clientMessageForErrorType(resolvedType),
  };
}

export class ApplicationException extends HttpException {
  readonly code?: ErrorCode;
  readonly details?: unknown;
  readonly type: ErrorType;
  readonly clientMessage: string;

  constructor(options: ApplicationExceptionOptions);
  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
    clientMessage?: ClientMessage | string,
    type?: ErrorType,
  );
  constructor(
    optionsOrStatusCode: ApplicationExceptionOptions | number,
    legacyCode?: ErrorCode,
    legacyMessage?: string,
    legacyDetails?: unknown,
    legacyClientMessage?: ClientMessage | string,
    legacyType?: ErrorType,
  ) {
    const options =
      typeof optionsOrStatusCode === 'number'
        ? legacyOptions(
            optionsOrStatusCode,
            legacyCode,
            legacyMessage,
            legacyDetails,
            legacyClientMessage,
            legacyType,
          )
        : optionsOrStatusCode;
    const type = options.type ?? errorTypeForStatus(options.statusCode);

    super(
      {
        statusCode: options.statusCode,
        ...(options.code === undefined ? {} : { code: options.code }),
        message: options.message,
        ...(options.details === undefined ? {} : { details: options.details }),
      },
      options.statusCode,
    );

    this.code = options.code;
    this.details = options.details;
    this.type = type;
    this.clientMessage = options.clientMessage;
  }
}
