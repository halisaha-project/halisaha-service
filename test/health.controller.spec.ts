import { HealthController } from '../src/modules/health/health.controller';

describe('HealthController', () => {
  it('returns an ok status', () => {
    expect(new HealthController().getHealth()).toEqual({ status: 'ok' });
  });
});
