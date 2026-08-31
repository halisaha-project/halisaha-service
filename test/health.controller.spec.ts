import { HealthController } from '../src/modules/health/health.controller';
import { ConnectionStates } from 'mongoose';

describe('HealthController', () => {
  it('reports a connected database as up', () => {
    const controller = new HealthController({
      readyState: ConnectionStates.connected,
    } as never);
    expect(controller.getHealth()).toEqual({ status: 'ok', database: 'up' });
  });

  it('reports an unavailable database as down', () => {
    const controller = new HealthController({
      readyState: ConnectionStates.disconnected,
    } as never);
    expect(controller.getHealth()).toEqual({
      status: 'error',
      database: 'down',
    });
  });
});
