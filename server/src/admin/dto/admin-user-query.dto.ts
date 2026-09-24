import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class AdminUserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'jane@' })
  @IsOptional()
  @IsString()
  search?: string;
}
