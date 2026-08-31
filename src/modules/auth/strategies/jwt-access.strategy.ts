import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ApplicationException } from '../../../common/errors/application.exception';
import { ErrorCode } from '../../../common/errors/error-code';
import { ACCESS_TOKEN_TYPE } from '../auth.constants';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

interface AccessTokenPayload {
  sub?: unknown;
  type?: unknown;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('jwtAccessSecret'),
      ignoreExpiration: false,
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    if (payload.type !== ACCESS_TOKEN_TYPE || typeof payload.sub !== 'string') {
      throw new ApplicationException(
        401,
        ErrorCode.INVALID_ACCESS_TOKEN,
        'Invalid access token',
      );
    }
    return { userId: payload.sub };
  }
}
