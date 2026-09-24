import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SubscriptionDto, UsageDto } from './dto/subscription.dto.js';

/** Internal-only plan limits — no payment gateway is wired up (see docs/memory.md). */
export const PLAN_REQUEST_LIMITS = {
  FREE: 50,
  PREMIUM: 5000,
} as const;

const PREMIUM_RENEWAL_DAYS = 30;

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMySubscription(userId: string): Promise<SubscriptionDto> {
    return this.findByUserIdOrThrow(userId);
  }

  async getUsage(userId: string): Promise<UsageDto> {
    const subscription = await this.findByUserIdOrThrow(userId);
    return {
      plan: subscription.plan,
      requestsUsed: subscription.requestsUsed,
      requestsLimit: subscription.requestsLimit,
      remaining: Math.max(0, subscription.requestsLimit - subscription.requestsUsed),
      renewsAt: subscription.renewsAt,
    };
  }

  async upgrade(userId: string): Promise<SubscriptionDto> {
    await this.findByUserIdOrThrow(userId);
    const renewsAt = new Date();
    renewsAt.setDate(renewsAt.getDate() + PREMIUM_RENEWAL_DAYS);

    return this.prisma.subscription.update({
      where: { userId },
      data: {
        plan: 'PREMIUM',
        status: 'ACTIVE',
        requestsLimit: PLAN_REQUEST_LIMITS.PREMIUM,
        renewsAt,
      },
    });
  }

  async downgrade(userId: string): Promise<SubscriptionDto> {
    await this.findByUserIdOrThrow(userId);

    return this.prisma.subscription.update({
      where: { userId },
      data: {
        plan: 'FREE',
        status: 'ACTIVE',
        requestsLimit: PLAN_REQUEST_LIMITS.FREE,
        renewsAt: null,
      },
    });
  }

  private async findByUserIdOrThrow(userId: string): Promise<SubscriptionDto> {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    return subscription;
  }
}
