import { Controller, Get, Post, Req, Res, UseGuards, Body, Query, Redirect } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { generateStateParameter, validateStateParameter } from './auth.utils';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  // Remember me preference endpoint
  @Post('remember-me')
  async setRememberMe(@Body() body: { rememberMe: boolean }, @Req() req) {
    req.session = req.session || {};
    req.session.rememberMe = body.rememberMe;
    console.log('Remember me preference set in session:', req.session.rememberMe);
    return { success: true };
  }

  // This is a middleware function to handle Google auth with custom state
  @Get('google')
  googleAuth(@Query('remember_me') rememberMeParam, @Res() res: Response) {
    const rememberMe = rememberMeParam === 'true';
    console.log('Remember me from URL param:', rememberMe);
    
    // Generate state parameter with remember me preference
    const state = generateStateParameter(rememberMe);
    
    // Get redirect URL from environment
    const googleAuthUrl = this.configService.get('GOOGLE_AUTH_URL') || 
      `${this.configService.get('API_URL')}/auth/google/redirect`;
    
    // Manually build the Google OAuth URL with state
    const clientID = this.configService.get('GOOGLE_CLIENT_ID');
    const redirectURI = encodeURIComponent(this.configService.get('GOOGLE_CALLBACK_URL') || '');
    const googleOAuthUrl = 
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `response_type=code&` +
      `client_id=${clientID}&` +
      `scope=email%20profile&` +
      `redirect_uri=${redirectURI}&` +
      `state=${state}`;
    
    // Redirect to Google OAuth with state parameter
    return res.redirect(googleOAuthUrl);
  }

  // Passport redirects to this endpoint
  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleRedirect() {
    // This is just a placeholder - Passport will handle the OAuth
    return { msg: 'Google Authentication' };
  }

  // Google OAuth callback
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req, @Res() res: Response, @Query('state') state) {
    console.log('Google callback received');
    
    // Get remember me preference from state parameter
    let rememberMe = false;
    
    if (state) {
      const stateRememberMe = validateStateParameter(state);
      if (stateRememberMe !== null) {
        rememberMe = stateRememberMe;
        console.log('Using remember me from state parameter:', rememberMe);
      }
    }
    
    // Fallback to session if state validation failed
    if (rememberMe === false && req.session?.rememberMe !== undefined) {
      rememberMe = req.session.rememberMe;
      console.log('Using remember me from session:', rememberMe);
    }
    
    // Final fallback to environment-based default
    if (rememberMe === false) {
      const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
      rememberMe = isProduction; // Default to true in production, false in dev
      console.log('Using environment-based default for remember me:', rememberMe);
    }
    
    console.log('Final remember me value:', rememberMe);
    
    // Get auth result with token and user info
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
    
    // Redirect to the frontend callback
    return res.redirect(`${this.configService.get('FRONTEND_URL')}/auth/callback?data=${encodedData}`);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req) {
    return req.user;
  }

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

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Req() req) {
    const refreshToken = req.body.refreshToken;
    
    await this.authService.logout(req.user.id, refreshToken);
    
    return { success: true };
  }
}