import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUserPayload } from '../../auth/interfaces/jwt-payload.interface.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Blocks a request once a user has used up their plan's request quota.
 * Attach to any endpoint that should count against subscription usage
 * (chat/search, per docs/architechture.md) — it only checks the limit here;
 * the calling service is responsible for incrementing requestsUsed after a
 * successful call.
 */
@Injectable()
export class SubscriptionLimitGuard {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUserPayload | undefined;
    if (!user) return false;

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: user.userId },
    });

    if (!subscription || subscription.requestsUsed >= subscription.requestsLimit) {
      throw new ForbiddenException('Request limit reached for your current plan');
    }
    return true;
  }
}
