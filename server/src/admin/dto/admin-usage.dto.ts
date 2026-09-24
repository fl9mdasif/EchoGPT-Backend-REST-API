import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto.js';

export class EndpointCountDto {
  @ApiProperty({ example: '/api/v1/chat/send' }) endpoint!: string;
  @ApiProperty({ example: 87 }) count!: number;
}

export class AdminUsageAnalyticsDto {
  @ApiProperty({ example: 4213 }) totalRequests!: number;
  @ApiProperty({ example: 412 }) requestsLast24h!: number;
  @ApiProperty({ example: 38.4 }) averageLatencyMs!: number;
  @ApiProperty({ example: { '2xx': 3980, '4xx': 210, '5xx': 23 } })
  byStatusClass!: Record<string, number>;
  @ApiProperty({ type: [EndpointCountDto] })
  topEndpoints!: EndpointCountDto[];
}

export class AdminLogDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) userId!: string | null;
  @ApiProperty() endpoint!: string;
  @ApiProperty() method!: string;
  @ApiProperty() statusCode!: number;
  @ApiProperty() latencyMs!: number;
  @ApiProperty() createdAt!: Date;
}

export class AdminLogListDto {
  @ApiProperty({ type: [AdminLogDto] })
  data!: AdminLogDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
