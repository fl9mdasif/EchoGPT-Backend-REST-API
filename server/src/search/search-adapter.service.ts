import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { SearchResultItemDto } from './dto/search-result.dto.js';

/**
 * Mocked, deterministic web search — no real search API is wired up, same
 * scope decision as the AI provider adapters (see docs/memory.md).
 */
@Injectable()
export class SearchAdapterService {
  async search(query: string): Promise<SearchResultItemDto[]> {
    await new Promise((resolve) => setTimeout(resolve, randomInt(10, 60)));

    const slug = query.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 60);
    return [1, 2, 3].map((i) => ({
      title: `${query} — result ${i}`,
      url: `https://example.com/search/${slug}-${i}`,
      snippet: `[mock result] A summary about "${query}" (result ${i} of 3).`,
    }));
  }
}
