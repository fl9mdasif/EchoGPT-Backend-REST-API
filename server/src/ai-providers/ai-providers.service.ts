import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decryptSecret, encryptSecret, maskSecret } from '../common/crypto/encryption.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AiProviderAdapter, ProviderHealth } from './adapters/ai-provider-adapter.interface.js';
import type { AiProviderDto } from './dto/ai-provider.dto.js';
import type { CreateAiProviderDto } from './dto/create-ai-provider.dto.js';
import type { UpdateAiProviderDto } from './dto/update-ai-provider.dto.js';
import { ProviderRegistryService } from './provider-registry.service.js';

@Injectable()
export class AiProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly registry: ProviderRegistryService,
  ) {}

  /** A user's own providers, plus enabled global ones they can select from. */
  async listForUser(userId: string): Promise<AiProviderDto[]> {
    const providers = await this.prisma.aiProvider.findMany({
      where: { OR: [{ ownerUserId: userId }, { ownerUserId: null, isEnabled: true }] },
      orderBy: { createdAt: 'asc' },
    });
    return providers.map((p) => this.toDto(p));
  }

  async create(userId: string, dto: CreateAiProviderDto): Promise<AiProviderDto> {
    const { apiKeyEncrypted, apiKeyPreview } = this.encryptApiKey(dto.apiKey);

    if (dto.isDefault) {
      await this.clearOtherDefaults(userId);
    }

    const provider = await this.prisma.aiProvider.create({
      data: {
        name: dto.name,
        type: dto.type,
        apiKeyEncrypted,
        apiKeyPreview,
        isEnabled: dto.isEnabled ?? true,
        isDefault: dto.isDefault ?? false,
        ownerUserId: userId,
      },
    });
    return this.toDto(provider);
  }

  async update(userId: string, id: string, dto: UpdateAiProviderDto): Promise<AiProviderDto> {
    await this.findOwnedOrThrow(userId, id);

    if (dto.isDefault) {
      await this.clearOtherDefaults(userId);
    }

    const keyUpdate =
      dto.apiKey !== undefined ? this.encryptApiKey(dto.apiKey) : { apiKeyEncrypted: undefined, apiKeyPreview: undefined };

    const provider = await this.prisma.aiProvider.update({
      where: { id },
      data: {
        name: dto.name,
        isEnabled: dto.isEnabled,
        isDefault: dto.isDefault,
        ...keyUpdate,
      },
    });
    return this.toDto(provider);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.aiProvider.delete({ where: { id } });
  }

  async healthCheck(userId: string, id: string): Promise<ProviderHealth> {
    const provider = await this.findVisibleOrThrow(userId, id);
    const adapter: AiProviderAdapter = this.registry.getAdapter(provider.type);
    const apiKey = provider.apiKeyEncrypted
      ? decryptSecret(provider.apiKeyEncrypted, this.config.get<string>('security.encryptionKey')!)
      : null;
    return adapter.healthCheck(apiKey);
  }

  private encryptApiKey(apiKey: string | undefined): {
    apiKeyEncrypted: string | null;
    apiKeyPreview: string | null;
  } {
    if (!apiKey) return { apiKeyEncrypted: null, apiKeyPreview: null };
    const encryptionKey = this.config.get<string>('security.encryptionKey')!;
    return {
      apiKeyEncrypted: encryptSecret(apiKey, encryptionKey),
      apiKeyPreview: maskSecret(apiKey),
    };
  }

  private async clearOtherDefaults(userId: string): Promise<void> {
    await this.prisma.aiProvider.updateMany({
      where: { ownerUserId: userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  private async findOwnedOrThrow(userId: string, id: string) {
    const provider = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!provider || provider.ownerUserId !== userId) {
      throw new NotFoundException('AI provider not found');
    }
    return provider;
  }

  private async findVisibleOrThrow(userId: string, id: string) {
    const provider = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!provider || (provider.ownerUserId !== userId && provider.ownerUserId !== null)) {
      throw new NotFoundException('AI provider not found');
    }
    return provider;
  }

  private toDto(provider: {
    id: string;
    name: string;
    type: AiProviderDto['type'];
    apiKeyPreview: string | null;
    isEnabled: boolean;
    isDefault: boolean;
    ownerUserId: string | null;
    createdAt: Date;
  }): AiProviderDto {
    return {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      apiKeyPreview: provider.apiKeyPreview,
      isEnabled: provider.isEnabled,
      isDefault: provider.isDefault,
      ownerUserId: provider.ownerUserId,
      createdAt: provider.createdAt,
    };
  }
}
