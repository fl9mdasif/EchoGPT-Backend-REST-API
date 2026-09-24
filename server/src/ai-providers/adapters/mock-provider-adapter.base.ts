import { randomInt } from 'node:crypto';
import type { ProviderType } from '../../generated/prisma/enums.js';
import type {
  AiProviderAdapter,
  ChatMessage,
  ChatResult,
  ProviderHealth,
} from './ai-provider-adapter.interface.js';

/**
 * Shared mock behavior for all three adapters (see the interface's doc
 * comment for why this is mocked). Each subclass only supplies its
 * provider type and display label.
 */
export abstract class MockProviderAdapterBase implements AiProviderAdapter {
  abstract readonly type: ProviderType;
  protected abstract readonly label: string;

  async chat(
    messages: ChatMessage[],
    apiKey: string | null,
  ): Promise<ChatResult> {
    await this.simulateLatency();
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'user');
    const content = `[mock ${this.label} response${apiKey ? '' : ' — no API key configured'}] You said: "${lastUserMessage?.content ?? ''}"`;
    return { content, tokensUsed: Math.ceil(content.length / 4) };
  }

  async healthCheck(_apiKey: string | null): Promise<ProviderHealth> {
    const start = Date.now();
    await this.simulateLatency();
    return { ok: true, latencyMs: Date.now() - start };
  }

  private simulateLatency(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, randomInt(10, 60)));
  }
}
