import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApplication } from './bootstrap';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const configService = app.get(ConfigService);

  configureApplication(app, {
    corsOrigins: configService.getOrThrow<string[]>('corsOrigins'),
    trustProxy: configService.getOrThrow<boolean>('trustProxy'),
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Halisaha API')
    .setDescription('Halisaha backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api-docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(configService.getOrThrow<number>('port'));
}

void bootstrap();
