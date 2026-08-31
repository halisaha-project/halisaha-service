import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PositionsService } from '../modules/positions/positions.service';

async function seed(): Promise<void> {
  const context = await NestFactory.createApplicationContext(AppModule);
  try {
    await context.get(PositionsService).seedCanonicalPositions();
  } finally {
    await context.close();
  }
}

void seed();
