import { Injectable } from '@nestjs/common';
import { ProviderType } from '../generated/prisma/enums.js';
import type { AiProviderAdapter } from './adapters/ai-provider-adapter.interface.js';
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
import { GeminiAdapter } from './adapters/gemini.adapter.js';
import { OpenAiAdapter } from './adapters/openai.adapter.js';

/** Looks up the right adapter for a provider row's `type`. Used here (health check) and by the Chat module (Phase 7). */
@Injectable()
export class ProviderRegistryService {
  private readonly adapters: Record<ProviderType, AiProviderAdapter>;

  constructor(openai: OpenAiAdapter, anthropic: AnthropicAdapter, gemini: GeminiAdapter) {
    this.adapters = {
      [ProviderType.OPENAI]: openai,
      [ProviderType.ANTHROPIC]: anthropic,
      [ProviderType.GEMINI]: gemini,
    };
  }

  getAdapter(type: ProviderType): AiProviderAdapter {
    return this.adapters[type];
  }
}
