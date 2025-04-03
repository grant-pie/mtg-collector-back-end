import { Controller, Get, Post, Req, Res, UseGuards, Body, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  // New endpoint to set remember me preference
  @Post('remember-me')
  async setRememberMe(@Body() body: { rememberMe: boolean }, @Req() req) {
    // Store in session
    req.session = req.session || {};
    req.session.rememberMe = body.rememberMe;
    console.log('Remember me preference set in session:', req.session.rememberMe);
    return { success: true };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth(@Req() req, @Query('remember_me') rememberMeParam) {
    console.log('Starting Google OAuth flow');
    
    // Initialize session if needed
    req.session = req.session || {};
    
    // If remember_me param is provided in URL, use it
    if (rememberMeParam !== undefined) {
      req.session.rememberMe = rememberMeParam === 'true';
      console.log('Remember me set from URL parameter:', req.session.rememberMe);
    }
    
    console.log('Session state at Google auth start:', req.session);
    // This route initiates Google OAuth
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req, @Res() res: Response, @Query('state') state) {
    console.log('Google callback received');
    console.log('Session in callback:', req.session);
    
    // Get remember me preference with multiple fallbacks
    let rememberMe = false;
    
    // 1. Try to get from session
    if (req.session && req.session.rememberMe !== undefined) {
      rememberMe = req.session.rememberMe;
      console.log('Using remember me from session:', rememberMe);
    } 
    // 2. Check URL parameters
    else if (req.query.remember_me !== undefined) {
      rememberMe = req.query.remember_me === 'true';
      console.log('Using remember me from query param:', rememberMe);
    }
    // 3. Use environment-based default as last resort
    else {
      const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
      rememberMe = isProduction; // Default to true in production, false in dev
      console.log('Using environment-based default for remember me:', rememberMe);
    }
    
    console.log('Final remember me value:', rememberMe);
    
    // Get auth result with token and user info, passing the remember me preference
    const authResult = await this.authService.login(
      req.user,
      rememberMe,
      req.headers['user-agent'],
      req.ip
    );
    
    // Clear the session rememberMe flag
    if (req.session?.rememberMe !== undefined) {
      delete req.session.rememberMe;
    }
    
    // Encode the entire auth result object to pass to frontend
    const encodedData = encodeURIComponent(JSON.stringify(authResult));
    
    // Redirect directly to the callback page
    return res.redirect(`${this.configService.get('FRONTEND_URL')}/auth/callback?data=${encodedData}`);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req) {
    return req.user;
  }

  // New endpoint to refresh tokens
  @Post('refresh-token')
  async refreshToken(@Req() req) {
    const refreshToken = req.body.refreshToken;
    
    if (!refreshToken) {
      return { 
        success: false, 
        message: 'Refresh token not found' 
      };
    }
    
    try {
      const authResult = await this.authService.refreshTokens(
        refreshToken,
        req.headers['user-agent'],
        req.ip
      );
      
      return authResult;
    } catch (error) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  }

  // New endpoint for logout
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Req() req) {
    const refreshToken = req.body.refreshToken;
    
    await this.authService.logout(req.user.id, refreshToken);
    
    return { success: true };
  }
}