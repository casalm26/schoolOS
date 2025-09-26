import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestUser {
  userId: string;
  role: string;
  email: string;
  name?: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.user ?? null;
  },
);
