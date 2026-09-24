import type { ProviderType } from '../../generated/prisma/enums.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResult {
  content: string;
  tokensUsed: number;
}

export interface ProviderHealth {
  ok: boolean;
  latencyMs: number;
}

/**
 * Every provider (OpenAI/Anthropic/Gemini) implements this. No real
 * provider SDKs are wired up — see docs/memory.md "No real AI provider keys
 * required to run": each adapter returns a deterministic mock response so
 * the assignment runs with zero external accounts. Real integration would
 * mean swapping the mock body in each adapter's chat()/healthCheck() for an
 * actual SDK call; the interface and dispatch (ProviderRegistry, and the
 * Chat module in Phase 7) don't change.
 */
export interface AiProviderAdapter {
  readonly type: ProviderType;
  chat(messages: ChatMessage[], apiKey: string | null): Promise<ChatResult>;
  healthCheck(apiKey: string | null): Promise<ProviderHealth>;
}
