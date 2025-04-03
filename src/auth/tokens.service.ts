// src/auth/tokens.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../user/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async generateRefreshToken(
    user: User,
    rememberMe: boolean,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<RefreshToken> {
    try {
      // Create expiry time - 30 days for remember me, 2 days otherwise
      const expiresAt = new Date();
      expiresAt.setTime(
        expiresAt.getTime() + 
        (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 2 * 24 * 60 * 60 * 1000)
      );
  
      // Generate unique token
      const token = uuidv4();
      
      console.log('Creating refresh token for user:', user.id, 'rememberMe:', rememberMe);
      
      // Create new refresh token entity
      const refreshToken = this.refreshTokenRepository.create({
        token,
        expiresAt,
        userAgent,
        ipAddress,
        user,
        userId: user.id,
      });
  
      // Save to database
      console.log('Attempting to save refresh token to database');
      const savedToken = await this.refreshTokenRepository.save(refreshToken);
      console.log('Successfully saved refresh token');
      return savedToken;
    } catch (error) {
      console.error('Error generating refresh token:', error);
      throw error;
    }
  }

  async validateRefreshToken(token: string): Promise<RefreshToken | null> {
    // Find the token in the database
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!refreshToken) {
      return null;
    }

    // Check if token is expired or revoked
    if (refreshToken.expiresAt < new Date() || refreshToken.isRevoked) {
      return null;
    }

    return refreshToken;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    // Find and mark the token as revoked
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token },
    });

    if (refreshToken) {
      refreshToken.isRevoked = true;
      await this.refreshTokenRepository.save(refreshToken);
    }
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    // Revoke all active tokens for a user
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true }
    );
  }

  async cleanupExpiredTokens(): Promise<void> {
    // This can be run periodically to remove old tokens
    const now = new Date();
    
    // Use TypeORM's LessThan operator instead of MongoDB-style query
    await this.refreshTokenRepository.delete({
      expiresAt: LessThan(now)
    });
  }
}