import { Module } from '@nestjs/common';
import { SubscriptionLimitGuard } from './guards/subscription-limit.guard.js';
import { SubscriptionsController } from './subscriptions.controller.js';
import { SubscriptionsService } from './subscriptions.service.js';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionLimitGuard],
  exports: [SubscriptionsService, SubscriptionLimitGuard],
})
export class SubscriptionsModule {}
