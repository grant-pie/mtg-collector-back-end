import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get ConfigService
  const configService = app.get(ConfigService);
  
  // Enable CORS with existing configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });
  
  // Add session middleware
  app.use(
    session({
      secret: configService.get('SESSION_SECRET') || 'remember-me-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60000, // 1 minute - just needed for OAuth flow
      }
    }),
  );
  
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();