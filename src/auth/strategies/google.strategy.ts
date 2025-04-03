import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile, StrategyOptions } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    // Determine the environment
    const isProduction = configService.get<string>('NODE_ENV') === 'production';
    
    // Get the appropriate callback URL based on environment
    let callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');
    
    // If we have environment-specific callback URLs defined, use them
    if (isProduction && configService.get<string>('GOOGLE_CALLBACK_URL_PROD')) {
      callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL_PROD');
    } else if (!isProduction && configService.get<string>('GOOGLE_CALLBACK_URL_DEV')) {
      callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL_DEV');
    }
    
    const options: StrategyOptions = {
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL,
      scope: ['email', 'profile'],
      // Add state parameter support for passing remember me preference
      // This allows us to store state between requests
      state: true
    };
    
    super(options);
  }

  async validate(
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