import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest(err: any, user: any) {
    if (err) {
      throw err;
    }
    return user ?? null;
  }

  override canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
