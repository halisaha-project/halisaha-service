import { Controller, Get, Inject } from '@nestjs/common';
import { Connection, ConnectionStates } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(getConnectionToken()) private readonly connection: Connection,
  ) {}

  @Get()
  getHealth() {
    const databaseIsUp =
      this.connection.readyState === ConnectionStates.connected;
    return databaseIsUp
      ? { status: 'ok', database: 'up' }
      : { status: 'error', database: 'down' };
  }
}
