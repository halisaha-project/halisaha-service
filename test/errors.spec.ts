import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../src/common/errors/error-code';
import { ApplicationException } from '../src/common/errors/application.exception';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { validationExceptionFactory } from '../src/bootstrap';

function hostFor(response: { status: jest.Mock; json: jest.Mock }) {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ method: 'GET', url: '/api/v1/unknown' }),
    }),
  } as never;
}

describe('HTTP error contract', () => {
  it('normalizes application exceptions', () => {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    new HttpExceptionFilter().catch(
      new ApplicationException(403, ErrorCode.FORBIDDEN, 'Forbidden'),
      hostFor(response),
    );
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Forbidden',
    });
  });

  it('normalizes validation details', () => {
    const exception = validationExceptionFactory([
      {
        property: 'name',
        constraints: { isString: 'name must be a string' },
        children: [],
      },
    ]);
    expect(exception.getResponse()).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [
        {
          property: 'name',
          constraints: { isString: 'name must be a string' },
        },
      ],
    });
  });

  it('normalizes NestJS exceptions and unknown errors', () => {
    const filter = new HttpExceptionFilter();
    const nestResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    filter.catch(new BadRequestException('bad input'), hostFor(nestResponse));
    expect(nestResponse.json).toHaveBeenCalledWith({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'bad input',
    });

    const notFoundResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    filter.catch(new NotFoundException(), hostFor(notFoundResponse));
    expect(notFoundResponse.json).toHaveBeenCalledWith({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Cannot GET /api/v1/unknown',
    });

    const unknownResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const logger = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    filter.catch(new Error('secret internals'), hostFor(unknownResponse));
    expect(unknownResponse.json).toHaveBeenCalledWith({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    });
    expect(logger).toHaveBeenCalledWith('Unhandled application error');
    expect(logger.mock.calls.flat().join(' ')).not.toContain(
      'secret internals',
    );
    logger.mockRestore();
  });

  it('normalizes rate-limit errors without implementation details', () => {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    new HttpExceptionFilter().catch(
      new HttpException('throttler internals', HttpStatus.TOO_MANY_REQUESTS),
      hostFor(response),
    );
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 429,
      code: 'RATE_LIMITED',
      message: 'Too many requests',
    });
  });
});
