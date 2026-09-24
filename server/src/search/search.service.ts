import { Injectable } from '@nestjs/common';
import { toSkipTake } from '../common/pagination.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SearchAdapterService } from './search-adapter.service.js';
import type {
  SearchHistoryItemDto,
  SearchHistoryListDto,
  SearchResponseDto,
  SearchResultItemDto,
  SearchSuggestionsDto,
} from './dto/search-result.dto.js';

const CACHE_WINDOW_MS = 5 * 60 * 1000;
const RECENT_LIMIT = 5;
const SUGGESTIONS_LIMIT = 5;

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapter: SearchAdapterService,
  ) {}

  async search(userId: string, query: string): Promise<SearchResponseDto> {
    const normalized = query.trim();

    const cached = await this.prisma.searchQuery.findFirst({
      where: {
        userId,
        query: normalized,
        createdAt: { gte: new Date(Date.now() - CACHE_WINDOW_MS) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (cached?.resultsJson) {
      return { query: normalized, cached: true, results: cached.resultsJson as unknown as SearchResultItemDto[] };
    }

    const results = await this.adapter.search(normalized);

    await this.prisma.$transaction([
      this.prisma.searchQuery.create({
        data: { userId, query: normalized, resultsJson: results as unknown as object },
      }),
      this.prisma.subscription.update({
        where: { userId },
        data: { requestsUsed: { increment: 1 } },
      }),
    ]);

    return { query: normalized, cached: false, results };
  }

  async history(userId: string, page: number, limit: number): Promise<SearchHistoryListDto> {
    const { skip, take } = toSkipTake(page, limit);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.searchQuery.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: { id: true, query: true, createdAt: true },
      }),
      this.prisma.searchQuery.count({ where: { userId } }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async recent(userId: string): Promise<SearchHistoryItemDto[]> {
    return this.prisma.searchQuery.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: RECENT_LIMIT,
      select: { id: true, query: true, createdAt: true },
    });
  }

  async suggestions(userId: string, prefix: string): Promise<SearchSuggestionsDto> {
    const trimmed = prefix.trim();
    if (!trimmed) return { suggestions: [] };

    const matches = await this.prisma.searchQuery.findMany({
      where: { userId, query: { contains: trimmed, mode: 'insensitive' } },
      distinct: ['query'],
      orderBy: { createdAt: 'desc' },
      take: SUGGESTIONS_LIMIT,
      select: { query: true },
    });

    return { suggestions: matches.map((m) => m.query) };
  }
}
