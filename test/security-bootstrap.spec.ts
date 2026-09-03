import { ShutdownSignal } from '@nestjs/common';
import { configureApplication } from '../src/bootstrap';

describe('HTTP security bootstrap', () => {
  it('configures Express, middleware, and exact CORS origins', () => {
    const express = { disable: jest.fn(), set: jest.fn() };
    const app = {
      getHttpAdapter: jest.fn().mockReturnValue({
        getInstance: jest.fn().mockReturnValue(express),
      }),
      enableShutdownHooks: jest.fn(),
      use: jest.fn(),
      enableCors: jest.fn(),
      setGlobalPrefix: jest.fn(),
      enableVersioning: jest.fn(),
      useGlobalPipes: jest.fn(),
      useGlobalFilters: jest.fn(),
    };

    configureApplication(app as never, {
      corsOrigins: ['https://app.example.com'],
      trustProxy: true,
    });

    expect(express.disable).toHaveBeenCalledWith('x-powered-by');
    expect(app.enableShutdownHooks).toHaveBeenCalledWith([
      ShutdownSignal.SIGTERM,
      ShutdownSignal.SIGINT,
    ]);
    expect(express.set).toHaveBeenCalledWith('trust proxy', true);
    expect(app.use).toHaveBeenCalledTimes(3);
    expect(app.enableCors).toHaveBeenCalledWith({
      origin: ['https://app.example.com'],
      credentials: false,
    });
  });

  it('does not enable CORS when no origins are configured', () => {
    const app = {
      getHttpAdapter: () => ({
        getInstance: () => ({ disable: jest.fn(), set: jest.fn() }),
      }),
      enableShutdownHooks: jest.fn(),
      use: jest.fn(),
      enableCors: jest.fn(),
      setGlobalPrefix: jest.fn(),
      enableVersioning: jest.fn(),
      useGlobalPipes: jest.fn(),
      useGlobalFilters: jest.fn(),
    };

    configureApplication(app as never);

    expect(app.enableCors).not.toHaveBeenCalled();
  });
});
