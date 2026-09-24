import { Module } from '@nestjs/common';
import { AiProvidersController } from './ai-providers.controller.js';
import { AiProvidersService } from './ai-providers.service.js';
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
import { GeminiAdapter } from './adapters/gemini.adapter.js';
import { OpenAiAdapter } from './adapters/openai.adapter.js';
import { ProviderRegistryService } from './provider-registry.service.js';

@Module({
  controllers: [AiProvidersController],
  providers: [
    AiProvidersService,
    ProviderRegistryService,
    OpenAiAdapter,
    AnthropicAdapter,
    GeminiAdapter,
  ],
  exports: [AiProvidersService, ProviderRegistryService],
})
export class AiProvidersModule {}
