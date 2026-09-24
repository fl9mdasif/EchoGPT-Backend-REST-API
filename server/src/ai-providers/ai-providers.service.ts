import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from '../common/crypto/encryption.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AiProviderAdapter,
  ProviderHealth,
} from './adapters/ai-provider-adapter.interface.js';
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
      where: {
        OR: [{ ownerUserId: userId }, { ownerUserId: null, isEnabled: true }],
      },
      orderBy: { createdAt: 'asc' },
    });
    return providers.map((p) => this.toDto(p));
  }

  async create(
    userId: string,
    dto: CreateAiProviderDto,
  ): Promise<AiProviderDto> {
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

  async update(
    userId: string,
    id: string,
    dto: UpdateAiProviderDto,
  ): Promise<AiProviderDto> {
    await this.findOwnedOrThrow(userId, id);

    if (dto.isDefault) {
      await this.clearOtherDefaults(userId);
    }

    const keyUpdate =
      dto.apiKey !== undefined
        ? this.encryptApiKey(dto.apiKey)
        : { apiKeyEncrypted: undefined, apiKeyPreview: undefined };

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

  // --- Admin-only: global (ownerUserId = null) providers, per docs/architechture.md §4/§7. ---

  async listGlobal(): Promise<AiProviderDto[]> {
    const providers = await this.prisma.aiProvider.findMany({
      where: { ownerUserId: null },
      orderBy: { createdAt: 'asc' },
    });
    return providers.map((p) => this.toDto(p));
  }

  async createGlobal(dto: CreateAiProviderDto): Promise<AiProviderDto> {
    const { apiKeyEncrypted, apiKeyPreview } = this.encryptApiKey(dto.apiKey);

    if (dto.isDefault) {
      await this.clearOtherGlobalDefaults();
    }

    const provider = await this.prisma.aiProvider.create({
      data: {
        name: dto.name,
        type: dto.type,
        apiKeyEncrypted,
        apiKeyPreview,
        isEnabled: dto.isEnabled ?? true,
        isDefault: dto.isDefault ?? false,
        ownerUserId: null,
      },
    });
    return this.toDto(provider);
  }

  async updateGlobal(
    id: string,
    dto: UpdateAiProviderDto,
  ): Promise<AiProviderDto> {
    await this.findGlobalOrThrow(id);

    if (dto.isDefault) {
      await this.clearOtherGlobalDefaults();
    }

    const keyUpdate =
      dto.apiKey !== undefined
        ? this.encryptApiKey(dto.apiKey)
        : { apiKeyEncrypted: undefined, apiKeyPreview: undefined };

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

  async removeGlobal(id: string): Promise<void> {
    await this.findGlobalOrThrow(id);
    await this.prisma.aiProvider.delete({ where: { id } });
  }

  private async findGlobalOrThrow(id: string) {
    const provider = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!provider || provider.ownerUserId !== null) {
      throw new NotFoundException('Global AI provider not found');
    }
    return provider;
  }

  private async clearOtherGlobalDefaults(): Promise<void> {
    await this.prisma.aiProvider.updateMany({
      where: { ownerUserId: null, isDefault: true },
      data: { isDefault: false },
    });
  }

  async healthCheck(userId: string, id: string): Promise<ProviderHealth> {
    const provider = await this.findVisibleOrThrow(userId, id);
    const adapter: AiProviderAdapter = this.registry.getAdapter(provider.type);
    const apiKey = this.decryptKey(provider.apiKeyEncrypted);
    return adapter.healthCheck(apiKey);
  }

  /** Throws if the provider doesn't exist or isn't visible to this user. Used by Chat when a conversation pins an explicit provider. */
  async assertVisible(userId: string, id: string): Promise<void> {
    await this.findVisibleOrThrow(userId, id);
  }

  /**
   * Resolves which provider + adapter + decrypted key to use for a chat
   * dispatch: an explicit id (validated as visible to the user) takes
   * priority, then the user's own default, then the global default.
   */
  async resolveForDispatch(
    userId: string,
    explicitProviderId?: string,
  ): Promise<{
    adapter: AiProviderAdapter;
    apiKey: string | null;
    providerId: string;
  }> {
    const provider = explicitProviderId
      ? await this.findVisibleOrThrow(userId, explicitProviderId)
      : await this.findDefaultOrThrow(userId);

    if (!provider.isEnabled) {
      throw new BadRequestException('This provider is disabled');
    }

    return {
      adapter: this.registry.getAdapter(provider.type),
      apiKey: this.decryptKey(provider.apiKeyEncrypted),
      providerId: provider.id,
    };
  }

  private decryptKey(apiKeyEncrypted: string | null): string | null {
    return apiKeyEncrypted
      ? decryptSecret(
          apiKeyEncrypted,
          this.config.get<string>('security.encryptionKey')!,
        )
      : null;
  }

  private async findDefaultOrThrow(userId: string) {
    const ownDefault = await this.prisma.aiProvider.findFirst({
      where: { ownerUserId: userId, isDefault: true, isEnabled: true },
    });
    if (ownDefault) return ownDefault;

    const globalDefault = await this.prisma.aiProvider.findFirst({
      where: { ownerUserId: null, isDefault: true, isEnabled: true },
    });
    if (globalDefault) return globalDefault;

    throw new BadRequestException(
      'No AI provider available — add one and set it as default, or ask an admin to enable a default',
    );
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
    if (
      !provider ||
      (provider.ownerUserId !== userId && provider.ownerUserId !== null)
    ) {
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
