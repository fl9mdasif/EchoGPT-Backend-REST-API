import { Injectable, NotFoundException } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AiProvidersService } from '../ai-providers/ai-providers.service.js';
import type { ChatMessage } from '../ai-providers/adapters/ai-provider-adapter.interface.js';
import { toSkipTake } from '../common/pagination.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  ConversationDto,
  ConversationListDto,
} from './dto/conversation.dto.js';
import type { CreateConversationDto } from './dto/create-conversation.dto.js';
import type {
  MessageDto,
  MessageListDto,
  SendMessageResponseDto,
} from './dto/message.dto.js';
import type { SendMessageDto } from './dto/send-message.dto.js';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvidersService: AiProvidersService,
  ) {}

  async listConversations(
    userId: string,
    page: number,
    limit: number,
  ): Promise<ConversationListDto> {
    const { skip, take } = toSkipTake(page, limit);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.conversation.count({ where: { userId } }),
    ]);
    return {
      data: data.map((c) => this.toConversationDto(c)),
      meta: { page, limit, total },
    };
  }

  async createConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationDto> {
    if (dto.providerId) {
      await this.aiProvidersService.assertVisible(userId, dto.providerId);
    }
    const conversation = await this.prisma.conversation.create({
      data: {
        userId,
        title: dto.title ?? 'New conversation',
        providerId: dto.providerId,
      },
    });
    return this.toConversationDto(conversation);
  }

  async listMessages(
    userId: string,
    conversationId: string,
    page: number,
    limit: number,
  ): Promise<MessageListDto> {
    await this.findOwnedConversationOrThrow(userId, conversationId);
    const { skip, take } = toSkipTake(page, limit);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        skip,
        take,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);
    return {
      data: data.map((m) => this.toMessageDto(m)),
      meta: { page, limit, total },
    };
  }

  async deleteConversation(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    await this.findOwnedConversationOrThrow(userId, conversationId);
    await this.prisma.conversation.delete({ where: { id: conversationId } });
  }

  async sendMessage(
    userId: string,
    dto: SendMessageDto,
  ): Promise<SendMessageResponseDto> {
    const conversation = dto.conversationId
      ? await this.findOwnedConversationOrThrow(userId, dto.conversationId)
      : await this.prisma.conversation.create({
          data: { userId, title: dto.content.slice(0, 60) },
        });

    const { adapter, apiKey, providerId } =
      await this.aiProvidersService.resolveForDispatch(
        userId,
        dto.providerId ?? conversation.providerId ?? undefined,
      );

    if (!conversation.providerId) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { providerId },
      });
    }

    const history = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    const userMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: dto.content,
      },
    });

    const chatMessages: ChatMessage[] = [...history, userMessage].map((m) => ({
      role: m.role.toLowerCase() as ChatMessage['role'],
      content: m.content,
    }));

    const result = await adapter.chat(chatMessages, apiKey);

    const [assistantMessage] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: result.content,
          tokensUsed: result.tokensUsed,
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      }),
      this.prisma.subscription.update({
        where: { userId },
        data: { requestsUsed: { increment: 1 } },
      }),
    ]);

    return {
      conversationId: conversation.id,
      userMessage: this.toMessageDto(userMessage),
      assistantMessage: this.toMessageDto(assistantMessage),
    };
  }

  /** Bonus SSE variant of sendMessage: same dispatch/persist logic, chunked word-by-word to the client as it "generates". */
  streamMessage(userId: string, dto: SendMessageDto): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      void (async () => {
        const conversation = dto.conversationId
          ? await this.findOwnedConversationOrThrow(userId, dto.conversationId)
          : await this.prisma.conversation.create({
              data: { userId, title: dto.content.slice(0, 60) },
            });

        const { adapter, apiKey, providerId } =
          await this.aiProvidersService.resolveForDispatch(
            userId,
            dto.providerId ?? conversation.providerId ?? undefined,
          );

        if (!conversation.providerId) {
          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: { providerId },
          });
        }

        const history = await this.prisma.message.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: 'asc' },
        });
        const userMessage = await this.prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'USER',
            content: dto.content,
          },
        });

        const chatMessages: ChatMessage[] = [...history, userMessage].map(
          (m) => ({
            role: m.role.toLowerCase() as ChatMessage['role'],
            content: m.content,
          }),
        );
        const result = await adapter.chat(chatMessages, apiKey);

        subscriber.next({
          type: 'conversation',
          data: { conversationId: conversation.id },
        });

        for (const word of result.content.split(' ')) {
          await new Promise((resolve) => setTimeout(resolve, 15));
          subscriber.next({ type: 'chunk', data: `${word} ` });
        }

        const [assistantMessage] = await this.prisma.$transaction([
          this.prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: 'ASSISTANT',
              content: result.content,
              tokensUsed: result.tokensUsed,
            },
          }),
          this.prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
          }),
          this.prisma.subscription.update({
            where: { userId },
            data: { requestsUsed: { increment: 1 } },
          }),
        ]);

        subscriber.next({
          type: 'done',
          data: {
            messageId: assistantMessage.id,
            tokensUsed: assistantMessage.tokensUsed,
          },
        });
        subscriber.complete();
      })().catch((error: unknown) => subscriber.error(error));
    });
  }

  private async findOwnedConversationOrThrow(userId: string, id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
    });
    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  private toConversationDto(c: {
    id: string;
    title: string;
    providerId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ConversationDto {
    return {
      id: c.id,
      title: c.title,
      providerId: c.providerId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private toMessageDto(m: {
    id: string;
    role: MessageDto['role'];
    content: string;
    tokensUsed: number | null;
    createdAt: Date;
  }): MessageDto {
    return {
      id: m.id,
      role: m.role,
      content: m.content,
      tokensUsed: m.tokensUsed,
      createdAt: m.createdAt,
    };
  }
}
