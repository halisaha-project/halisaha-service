import { HttpException } from '@nestjs/common';
import { ErrorCode } from './error-code';

export class ApplicationException extends HttpException {
  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(
      {
        statusCode,
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
      statusCode,
    );
  }
}
