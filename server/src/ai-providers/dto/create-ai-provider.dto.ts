import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ProviderType } from '../../generated/prisma/enums.js';

export class CreateAiProviderDto {
  @ApiProperty({ example: 'My OpenAI key' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ enum: ProviderType, example: ProviderType.OPENAI })
  @IsEnum(ProviderType)
  type!: ProviderType;

  @ApiPropertyOptional({
    example: 'sk-...',
    description: 'Stored encrypted; never returned as-is',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  apiKey?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
