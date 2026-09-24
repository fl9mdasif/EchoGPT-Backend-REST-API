import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageRole } from '../../generated/prisma/enums.js';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto.js';

export class MessageDto {
  @ApiProperty({ example: 'ckv2z9q4x0000abc123def456' })
  id!: string;

  @ApiProperty({ enum: MessageRole, example: MessageRole.USER })
  role!: MessageRole;

  @ApiProperty({ example: 'What is the capital of France?' })
  content!: string;

  @ApiPropertyOptional({ nullable: true })
  tokensUsed!: number | null;

  @ApiProperty()
  createdAt!: Date;
}

export class MessageListDto {
  @ApiProperty({ type: [MessageDto] })
  data!: MessageDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class SendMessageResponseDto {
  @ApiProperty()
  conversationId!: string;

  @ApiProperty({ type: MessageDto })
  userMessage!: MessageDto;

  @ApiProperty({ type: MessageDto })
  assistantMessage!: MessageDto;
}
