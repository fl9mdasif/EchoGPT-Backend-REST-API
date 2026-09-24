import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { CurrentUserPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { SubscriptionLimitGuard } from '../subscriptions/guards/subscription-limit.guard.js';
import {
  SearchHistoryItemDto,
  SearchHistoryListDto,
  SearchResponseDto,
  SearchSuggestionsDto,
} from './dto/search-result.dto.js';
import { SearchQueryDto } from './dto/search-query.dto.js';
import { SearchService } from './search.service.js';

@ApiTags('search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @UseGuards(SubscriptionLimitGuard)
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run a web search',
    description:
      'Identical queries from the same user within 5 minutes are served from cache and do not count against your subscription usage.',
  })
  @ApiResponse({ status: 200, type: SearchResponseDto })
  @ApiResponse({ status: 403, description: 'Subscription request limit reached' })
  search(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SearchQueryDto,
  ): Promise<SearchResponseDto> {
    return this.searchService.search(user.userId, dto.query);
  }

  @Get('history')
  @ApiOperation({ summary: 'Paginated search history' })
  @ApiResponse({ status: 200, type: SearchHistoryListDto })
  history(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: PaginationQueryDto,
  ): Promise<SearchHistoryListDto> {
    return this.searchService.history(user.userId, query.page, query.limit);
  }

  @Get('recent')
  @ApiOperation({ summary: 'The 5 most recent searches' })
  @ApiResponse({ status: 200, type: [SearchHistoryItemDto] })
  recent(@CurrentUser() user: CurrentUserPayload): Promise<SearchHistoryItemDto[]> {
    return this.searchService.recent(user.userId);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Suggest past queries matching a prefix' })
  @ApiQuery({ name: 'q', required: true, example: 'best bud' })
  @ApiResponse({ status: 200, type: SearchSuggestionsDto })
  suggestions(
    @CurrentUser() user: CurrentUserPayload,
    @Query('q') q: string,
  ): Promise<SearchSuggestionsDto> {
    return this.searchService.suggestions(user.userId, q ?? '');
  }
}
