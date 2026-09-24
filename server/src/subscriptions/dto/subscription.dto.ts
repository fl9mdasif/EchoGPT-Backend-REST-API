import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Plan, SubscriptionStatus } from '../../generated/prisma/enums.js';

export class SubscriptionDto {
  @ApiProperty({ example: 'ckv2z9q4x0000abc123def456' })
  id!: string;

  @ApiProperty({ enum: Plan, example: Plan.FREE })
  plan!: Plan;

  @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.ACTIVE })
  status!: SubscriptionStatus;

  @ApiProperty({ example: 12 })
  requestsUsed!: number;

  @ApiProperty({ example: 50 })
  requestsLimit!: number;

  @ApiPropertyOptional({ example: '2026-10-24T00:00:00.000Z', nullable: true })
  renewsAt!: Date | null;
}

export class UsageDto {
  @ApiProperty({ enum: Plan, example: Plan.FREE })
  plan!: Plan;

  @ApiProperty({ example: 12 })
  requestsUsed!: number;

  @ApiProperty({ example: 50 })
  requestsLimit!: number;

  @ApiProperty({
    example: 38,
    description: 'requestsLimit - requestsUsed, floored at 0',
  })
  remaining!: number;

  @ApiPropertyOptional({ example: '2026-10-24T00:00:00.000Z', nullable: true })
  renewsAt!: Date | null;
}
