import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApplicationException } from '../../../common/errors/application.exception';
import { ErrorCode } from '../../../common/errors/error-code';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {
  canActivate(context: ExecutionContext): Promise<boolean> {
    return super.canActivate(context) as Promise<boolean>;
  }

  handleRequest<TUser = AuthenticatedUser>(error: unknown, user: TUser): TUser {
    if (error || !user) {
      throw new ApplicationException(
        401,
        ErrorCode.INVALID_ACCESS_TOKEN,
        'Invalid access token',
      );
    }
    return user;
  }
}
