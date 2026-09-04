import { CallHandler, ExecutionContext, HttpStatus } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

function contextFor(statusCode: number, originalUrl: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ originalUrl }),
      getResponse: () => ({ statusCode }),
    }),
  } as ExecutionContext;
}

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor<unknown>();

  it.each([
    [HttpStatus.OK, '/api/v1/groups'],
    [HttpStatus.CREATED, '/api/v1/groups'],
  ])('wraps an HTTP %i controller result', async (statusCode, path) => {
    const data = { id: 'group-id', nested: { value: true } };
    const handler: CallHandler<typeof data> = { handle: () => of(data) };

    const result = await lastValueFrom(
      interceptor.intercept(contextFor(statusCode, path), handler),
    );

    expect(result).toEqual({
      statusCode,
      success: true,
      timestamp: expect.any(String),
      path,
      data,
      error: null,
    });
    expect(result.data).toBe(data);
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('preserves undefined controller results under data', async () => {
    const handler: CallHandler<undefined> = { handle: () => of(undefined) };

    await expect(
      lastValueFrom(
        new ResponseInterceptor<undefined>().intercept(
          contextFor(HttpStatus.OK, '/api/v1/example'),
          handler,
        ),
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        data: undefined,
        error: null,
      }),
    );
  });

  it('does not swallow or transform thrown errors', async () => {
    const error = new Error('controller failure');
    const handler: CallHandler<never> = {
      handle: () => throwError(() => error),
    };

    await expect(
      lastValueFrom(
        interceptor.intercept(
          contextFor(HttpStatus.OK, '/api/v1/groups'),
          handler,
        ),
      ),
    ).rejects.toBe(error);
  });
});
