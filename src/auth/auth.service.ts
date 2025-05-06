import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/entities/user.entity';
import { TokensService } from './tokens.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private tokensService: TokensService,
  ) {}

  async login(user: User, rememberMe: boolean = false, userAgent?: string, ipAddress?: string) {
    try {
      // Create JWT payload
      const payload = { 
        sub: user.id,
        email: user.email,
        role: user.role
      };
      
      // Generate access token with the same 1d expiry as in your JWT module
      const accessToken = this.jwtService.sign(payload);
      
      // Generate refresh token if remember me is enabled
      // Use string | null type to avoid type error
      let refreshToken: string | null = null;
      
      console.log('Login called with rememberMe:', rememberMe);
      
      if (rememberMe) {
        const refreshTokenEntity = await this.tokensService.generateRefreshToken(
          user,
          true, 
          userAgent,
          ipAddress
        );
        refreshToken = refreshTokenEntity.token;
      }
      
      // Return the same structure as your existing service but with refresh token
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          picture: user.picture,
          username: user.username,
          role: user.role,
        },
        rememberMe,
      };
    } catch (error) {
      console.error('Error in login method:', error);
      throw error;
    }
  }
  
  async refreshTokens(refreshToken: string, userAgent?: string, ipAddress?: string) {
    // Validate the refresh token
    const tokenData = await this.tokensService.validateRefreshToken(refreshToken);
    
    if (!tokenData) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    const user = tokenData.user;
    
    // Revoke the used refresh token (token rotation for security)
    await this.tokensService.revokeRefreshToken(refreshToken);
    
    // Create new JWT payload
    const payload = { 
      sub: user.id,
      email: user.email,
      role: user.role
    };
    
    // Generate new access token
    const accessToken = this.jwtService.sign(payload, { 
      expiresIn: '7d' // or whatever duration you want
    });
    
    // Generate new refresh token
    const newRefreshTokenEntity = await this.tokensService.generateRefreshToken(
      user,
      true, // Keep the same as before (long-lived)
      userAgent,
      ipAddress
    );
    
    // Return new tokens and user data
    return {
      access_token: accessToken,
      refresh_token: newRefreshTokenEntity.token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.picture,
        username: user.username,
        role: user.role,
      },
    };
  }
  
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Revoke the specific refresh token if provided
      await this.tokensService.revokeRefreshToken(refreshToken);
    } else {
      // Otherwise revoke all refresh tokens for this user
      await this.tokensService.revokeAllUserRefreshTokens(userId);
    }
    
    return { success: true };
  }
}