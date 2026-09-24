import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

/** Reads whatever the active passport strategy's validate() attached to req.user. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return request.user;
});
