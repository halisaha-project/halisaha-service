import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApplication } from './bootstrap';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  configureApplication(app);

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

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
