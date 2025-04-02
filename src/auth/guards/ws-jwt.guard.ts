import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';
import { UserService } from '../../user/user.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private userService: UserService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractTokenFromHeader(client);

    if (!token) {
      throw new WsException('Unauthorized');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      
      // Optionally fetch the user from the database to ensure it exists and is active
      const user = await this.userService.findById(payload.id);
      if (!user) {
        throw new WsException('User not found');
      }
      
      // Attach user to socket data
      client.data.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username
      };
      
      return true;
    } catch (error) {
      throw new WsException('Unauthorized');
    }
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    // First try to get from headers
    const auth = client.handshake.headers.authorization;
    if (auth && !Array.isArray(auth)) {
      const [type, token] = auth.split(' ');
      if (type === 'Bearer') {
        return token;
      }
    }
    
    // Then try to get from handshake query
    const { token } = client.handshake.auth;
    return token;
  }
}