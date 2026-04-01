import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('[bootstrap] creating app');
  const app = await NestFactory.create(AppModule);
  console.log('[bootstrap] app created');
  const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim());

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: corsOrigin?.length ? corsOrigin : true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT || 4000);
  console.log(`[bootstrap] listening on ${port}`);
  await app.listen(port);
  console.log(`[bootstrap] listening ready on ${port}`);
}

bootstrap();
