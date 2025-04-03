import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    // Instead of using the StrategyOptions type which has incorrect typing,
    // we need to use a more generic object and cast it
    const options = {
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
      passReqToCallback: true
    };
    
    super(options as any);
  }

  async validate(
    request: any,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    
    const user = await this.userService.findOrCreateUser({
      googleId: id,
      email: emails && emails.length > 0 ? emails[0].value : null,
      firstName: name?.givenName || null,
      lastName: name?.familyName || null,
      picture: photos && photos.length > 0 ? photos[0].value : null,
    });
  
    done(null, user);
  }
}