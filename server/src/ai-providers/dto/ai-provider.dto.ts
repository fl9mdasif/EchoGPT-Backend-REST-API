import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderType } from '../../generated/prisma/enums.js';

export class AiProviderDto {
  @ApiProperty({ example: 'ckv2z9q4x0000abc123def456' })
  id!: string;

  @ApiProperty({ example: 'My OpenAI key' })
  name!: string;

  @ApiProperty({ enum: ProviderType, example: ProviderType.OPENAI })
  type!: ProviderType;

  @ApiPropertyOptional({ example: 'sk-a••••cd12', nullable: true, description: 'Masked; the real key is never returned' })
  apiKeyPreview!: string | null;

  @ApiProperty()
  isEnabled!: boolean;

  @ApiProperty()
  isDefault!: boolean;

  @ApiPropertyOptional({ nullable: true, description: 'null means a global provider, not owned by any single user' })
  ownerUserId!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class ProviderHealthDto {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty({ example: 42 })
  latencyMs!: number;
}
