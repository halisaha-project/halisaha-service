import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientMessage } from '../src/common/errors/client-message';
import { ErrorCode } from '../src/common/errors/error-code';
import { ErrorType } from '../src/common/errors/error-type';
import { ApplicationException } from '../src/common/errors/application.exception';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { validationExceptionFactory } from '../src/bootstrap';

function hostFor(response: { status: jest.Mock; json: jest.Mock }) {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ originalUrl: '/api/v1/unknown' }),
    }),
  } as never;
}

describe('HTTP error contract', () => {
  it('normalizes application exceptions', () => {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    new HttpExceptionFilter().catch(
      new ApplicationException({
        statusCode: 403,
        code: ErrorCode.FORBIDDEN,
        message: 'Forbidden',
        type: ErrorType.Forbidden,
        clientMessage: 'Bu işlem için yetkiniz yok.',
      }),
      hostFor(response),
    );
    const payload = response.json.mock.calls[0][0];
    expect(payload).toEqual({
      statusCode: 403,
      success: false,
      timestamp: expect.any(String),
      path: '/api/v1/unknown',
      data: null,
      error: {
        message: 'Forbidden',
        type: 'FORBIDDEN',
        clientMessage: 'Bu işlem için yetkiniz yok.',
      },
    });
    expect(new Date(payload.timestamp).toISOString()).toBe(payload.timestamp);
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
      message: 'name must be a string',
      details: [
        {
          property: 'name',
          constraints: { isString: 'name must be a string' },
        },
      ],
    });
  });

  it('normalizes standard NestJS exceptions with safe Turkish fallbacks', () => {
    const filter = new HttpExceptionFilter();
    const nestResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    filter.catch(new BadRequestException('bad input'), hostFor(nestResponse));
    expect(nestResponse.json).toHaveBeenCalledWith({
      statusCode: 400,
      success: false,
      timestamp: expect.any(String),
      path: '/api/v1/unknown',
      data: null,
      error: {
        message: 'bad input',
        type: 'BAD_REQUEST',
        clientMessage: ClientMessage.BadRequest,
      },
    });

    const notFoundResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    filter.catch(new NotFoundException(), hostFor(notFoundResponse));
    expect(notFoundResponse.json).toHaveBeenCalledWith({
      statusCode: 404,
      success: false,
      timestamp: expect.any(String),
      path: '/api/v1/unknown',
      data: null,
      error: {
        message: 'Not Found',
        type: 'NOT_FOUND',
        clientMessage: ClientMessage.NotFound,
      },
    });

    const unauthorizedResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    filter.catch(new UnauthorizedException(), hostFor(unauthorizedResponse));
    expect(unauthorizedResponse.json).toHaveBeenCalledWith({
      statusCode: 401,
      success: false,
      timestamp: expect.any(String),
      path: '/api/v1/unknown',
      data: null,
      error: {
        message: 'Unauthorized',
        type: 'UNAUTHORIZED',
        clientMessage: ClientMessage.Unauthorized,
      },
    });
  });

  it('returns and logs a safe envelope for unknown errors', () => {
    const filter = new HttpExceptionFilter();
    const unknownResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const logger = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    filter.catch(new Error('secret internals'), hostFor(unknownResponse));
    const payload = unknownResponse.json.mock.calls[0][0];
    expect(payload).toEqual({
      statusCode: 500,
      success: false,
      timestamp: expect.any(String),
      path: '/api/v1/unknown',
      data: null,
      error: {
        message: 'Internal server error',
        type: 'INTERNAL_SERVER_ERROR',
        clientMessage: ClientMessage.InternalServerError,
      },
    });
    expect(JSON.stringify(payload)).not.toContain('secret internals');
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
      success: false,
      timestamp: expect.any(String),
      path: '/api/v1/unknown',
      data: null,
      error: {
        message: 'Too many requests',
        type: 'TOO_MANY_REQUESTS',
        clientMessage: ClientMessage.TooManyRequests,
      },
    });
  });
});
