import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get ConfigService
  const configService = app.get(ConfigService);
  
  // Determine environment
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Enable CORS with proper configuration for HTTP/HTTPS scenarios
  app.enableCors({
    origin: [
      configService.get('FRONTEND_URL'),
      "https://grant-pie.github.io"
      // Add any additional origins you need
    ],
    credentials: true, // Essential for cookies to work cross-domain
  });
  
  // Add session middleware with improved configuration
  app.use(
    session({
      secret: configService.get('SESSION_SECRET') || 'remember-me-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: isProduction, // Only require HTTPS in production
        httpOnly: true,
        maxAge: 60000 * 5, // Increase to 5 minutes to cover the entire OAuth flow
        sameSite: isProduction ? 'none' : 'lax', // 'none' allows cookies in cross-site requests (needed for HTTPS)
      }
    }),
  );
  
  // Optional: Add global prefix if you want all endpoints to be under /api
  // app.setGlobalPrefix('api');
  
  await app.listen(configService.get('PORT') ?? 3001);
  
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Session cookie secure: ${isProduction}`);
  console.log(`Session cookie sameSite: ${isProduction ? 'none' : 'lax'}`);
}
bootstrap();