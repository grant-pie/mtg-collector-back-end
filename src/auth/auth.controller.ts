import { Controller, Get, Post, Req, Res, UseGuards, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // New endpoint to set remember me preference
  @Post('remember-me')
  async setRememberMe(@Body() body: { rememberMe: boolean }, @Req() req) {
    // Store in session
    req.session = req.session || {};
    req.session.rememberMe = body.rememberMe;
    return { success: true };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // This route initiates Google OAuth
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req, @Res() res: Response) {
    // Get remember me preference from session or default to false
    const rememberMe = true;
    
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
    // This maintains your existing pattern of passing data via URL
    const encodedData = encodeURIComponent(JSON.stringify(authResult));
    
    // Redirect to frontend with encoded data
    return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?data=${encodedData}`);
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