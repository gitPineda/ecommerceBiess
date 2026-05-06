import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOriginRaw = process.env.CORS_ORIGIN?.trim();
  const corsOrigin =
    corsOriginRaw && corsOriginRaw !== '*'
      ? corsOriginRaw.split(',').map((origin) => origin.trim())
      : true;
  const appWithBodyParser = app as typeof app & {
    useBodyParser: (
      type: 'json' | 'urlencoded',
      options: Record<string, unknown>,
    ) => void;
  };

  app.setGlobalPrefix('api');
  appWithBodyParser.useBodyParser('json', {
    limit: '12mb',
  });
  appWithBodyParser.useBodyParser('urlencoded', {
    limit: '12mb',
    extended: true,
  });
  app.enableCors({
    origin: corsOrigin,
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
  await app.listen(port);
}

bootstrap();
