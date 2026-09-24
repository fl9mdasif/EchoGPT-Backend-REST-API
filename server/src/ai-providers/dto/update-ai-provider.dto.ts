import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateAiProviderDto {
  @ApiPropertyOptional({ example: 'My OpenAI key (renamed)' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'sk-...', description: 'Replaces the stored key if provided' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  apiKey?: string;

  @ApiPropertyOptional({ description: 'Enable/disable this provider' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Set as your default provider (unsets any other default of yours)' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
