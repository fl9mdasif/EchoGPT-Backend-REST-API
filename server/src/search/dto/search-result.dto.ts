import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto.js';

export class SearchResultItemDto {
  @ApiProperty({ example: "Best budget laptops of 2026 — a buyer's guide" })
  title!: string;

  @ApiProperty({ example: 'https://example.com/best-budget-laptops-2026' })
  url!: string;

  @ApiProperty({ example: 'A roundup of the best budget laptops...' })
  snippet!: string;
}

export class SearchResponseDto {
  @ApiProperty({ example: 'best budget laptops 2026' })
  query!: string;

  @ApiProperty({
    description:
      'true if served from the recent-query cache instead of re-searching',
  })
  cached!: boolean;

  @ApiProperty({ type: [SearchResultItemDto] })
  results!: SearchResultItemDto[];
}

export class SearchHistoryItemDto {
  @ApiProperty({ example: 'ckv2z9q4x0000abc123def456' })
  id!: string;

  @ApiProperty({ example: 'best budget laptops 2026' })
  query!: string;

  @ApiProperty()
  createdAt!: Date;
}

export class SearchHistoryListDto {
  @ApiProperty({ type: [SearchHistoryItemDto] })
  data!: SearchHistoryItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class SearchSuggestionsDto {
  @ApiProperty({
    type: [String],
    example: ['best budget laptops 2026', 'best budget laptops for students'],
  })
  suggestions!: string[];
}
