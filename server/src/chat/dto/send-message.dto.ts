import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiPropertyOptional({
    description: 'Existing conversation to continue. Omit to start a new one.',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty({ example: 'What is the capital of France?' })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({
    description:
      'Override the provider for this message only (else conversation/default provider is used)',
  })
  @IsOptional()
  @IsString()
  providerId?: string;
}
