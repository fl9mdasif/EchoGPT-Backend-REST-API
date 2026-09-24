import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Plan, SubscriptionStatus } from '../../generated/prisma/enums.js';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto.js';

export class AdminSubscriptionDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() userEmail!: string;
  @ApiProperty({ enum: Plan }) plan!: Plan;
  @ApiProperty({ enum: SubscriptionStatus }) status!: SubscriptionStatus;
  @ApiProperty() requestsUsed!: number;
  @ApiProperty() requestsLimit!: number;
  @ApiPropertyOptional({ nullable: true }) renewsAt!: Date | null;
}

export class AdminSubscriptionListDto {
  @ApiProperty({ type: [AdminSubscriptionDto] })
  data!: AdminSubscriptionDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class UpdateAdminSubscriptionDto {
  @ApiPropertyOptional({ enum: Plan })
  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  requestsLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  requestsUsed?: number;
}
