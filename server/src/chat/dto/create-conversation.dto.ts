import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateConversationDto {
  @ApiPropertyOptional({ example: 'Trip planning' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({
    description:
      'A provider id to use for this conversation; falls back to your default',
  })
  @IsOptional()
  @IsString()
  providerId?: string;
}
