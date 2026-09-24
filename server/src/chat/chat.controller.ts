import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MessageEvent, Sse } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Observable } from 'rxjs';
import type { CurrentUserPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { SubscriptionLimitGuard } from '../subscriptions/guards/subscription-limit.guard.js';
import { ChatService } from './chat.service.js';
import {
  ConversationDto,
  ConversationListDto,
} from './dto/conversation.dto.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { MessageListDto, SendMessageResponseDto } from './dto/message.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({
    summary: 'List your conversations, most recently active first',
  })
  @ApiResponse({ status: 200, type: ConversationListDto })
  listConversations(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: PaginationQueryDto,
  ): Promise<ConversationListDto> {
    return this.chatService.listConversations(
      user.userId,
      query.page,
      query.limit,
    );
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Start a new conversation' })
  @ApiResponse({ status: 201, type: ConversationDto })
  createConversation(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationDto> {
    return this.chatService.createConversation(user.userId, dto);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Paginated message history for a conversation' })
  @ApiResponse({ status: 200, type: MessageListDto })
  @ApiResponse({ status: 404, description: 'Not found, or not owned by you' })
  listMessages(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<MessageListDto> {
    return this.chatService.listMessages(
      user.userId,
      id,
      query.page,
      query.limit,
    );
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a conversation and its messages' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Not found, or not owned by you' })
  async deleteConversation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<void> {
    await this.chatService.deleteConversation(user.userId, id);
  }

  @Post('send')
  @UseGuards(SubscriptionLimitGuard)
  @SkipThrottle()
  @ApiOperation({
    summary: 'Send a prompt and get the AI response',
    description:
      'Dispatches to the resolved provider (explicit -> conversation -> your default -> global default), persists both messages, and counts against your subscription usage. Exempt from the generic per-IP throttle — the subscription plan quota (SubscriptionLimitGuard) is the appropriate rate limit here, and 20 req/min would be unworkably low for an active chat session.',
  })
  @ApiResponse({ status: 201, type: SendMessageResponseDto })
  @ApiResponse({
    status: 400,
    description: 'No provider available, or the resolved provider is disabled',
  })
  @ApiResponse({
    status: 403,
    description: 'Subscription request limit reached',
  })
  @HttpCode(HttpStatus.CREATED)
  send(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SendMessageDto,
  ): Promise<SendMessageResponseDto> {
    return this.chatService.sendMessage(user.userId, dto);
  }

  @Sse('send/stream')
  @UseGuards(SubscriptionLimitGuard)
  @SkipThrottle()
  @ApiOperation({
    summary: 'Bonus: stream the AI response as Server-Sent Events',
    description:
      'GET (not POST) so browser EventSource can consume it directly. Emits a "conversation" event, one "chunk" event per word, then a "done" event.',
  })
  streamSend(
    @CurrentUser() user: CurrentUserPayload,
    @Query() dto: SendMessageDto,
  ): Observable<MessageEvent> {
    return this.chatService.streamMessage(user.userId, dto);
  }
}
