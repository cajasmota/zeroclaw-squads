import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: configService.get('FRONTEND_URL', 'http://localhost:3000'), credentials: true });

  const port = configService.get<number>('BACKEND_PORT', 3001);
  await app.listen(port);
  console.log(`AES Backend running on port ${port}`);
}
bootstrap();
