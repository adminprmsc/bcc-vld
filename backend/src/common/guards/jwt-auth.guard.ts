import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException({ msg: 'No token, authorization denied' });
    }
    return user;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.header?.('Authorization') || request.headers?.authorization;
    if (!header) {
      throw new UnauthorizedException({ msg: 'No token, authorization denied' });
    }
    return (await super.canActivate(context)) as boolean;
  }
}
