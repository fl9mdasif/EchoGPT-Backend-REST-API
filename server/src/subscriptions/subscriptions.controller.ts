import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { CurrentUserPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { SubscriptionDto, UsageDto } from './dto/subscription.dto.js';
import { SubscriptionsService } from './subscriptions.service.js';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me')
  @ApiOperation({ summary: "Get the current user's subscription status" })
  @ApiResponse({ status: 200, type: SubscriptionDto })
  getMe(@CurrentUser() user: CurrentUserPayload): Promise<SubscriptionDto> {
    return this.subscriptionsService.getMySubscription(user.userId);
  }

  @Get('usage')
  @ApiOperation({
    summary: 'Get remaining requests for the current billing period',
  })
  @ApiResponse({ status: 200, type: UsageDto })
  getUsage(@CurrentUser() user: CurrentUserPayload): Promise<UsageDto> {
    return this.subscriptionsService.getUsage(user.userId);
  }

  @Post('upgrade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upgrade to the PREMIUM plan',
    description:
      'No payment gateway is wired up — this is an internal state change only.',
  })
  @ApiResponse({ status: 200, type: SubscriptionDto })
  upgrade(@CurrentUser() user: CurrentUserPayload): Promise<SubscriptionDto> {
    return this.subscriptionsService.upgrade(user.userId);
  }

  @Post('downgrade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Downgrade to the FREE plan' })
  @ApiResponse({ status: 200, type: SubscriptionDto })
  downgrade(@CurrentUser() user: CurrentUserPayload): Promise<SubscriptionDto> {
    return this.subscriptionsService.downgrade(user.userId);
  }
}
