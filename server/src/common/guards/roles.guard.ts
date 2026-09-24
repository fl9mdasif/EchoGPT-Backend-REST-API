import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { CurrentUserPayload } from '../../auth/interfaces/jwt-payload.interface.js';
import { Role } from '../../generated/prisma/enums.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

/** Runs after JwtAuthGuard. No @Roles() on the route means no restriction. */
@Injectable()
export class RolesGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUserPayload | undefined;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role for this operation');
    }
    return true;
  }
}
