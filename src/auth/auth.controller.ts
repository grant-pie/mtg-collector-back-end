import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // This route initiates Google OAuth
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req, @Res() res: Response) {
    // Get auth result with token and user info
    const authResult = await this.authService.login(req.user);
    
    // Encode the entire auth result object to pass to frontend
    const encodedData = encodeURIComponent(JSON.stringify(authResult));
    
    // Redirect to frontend with encoded data
    return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?data=${encodedData}`);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req) {
    return req.user;
  }
}