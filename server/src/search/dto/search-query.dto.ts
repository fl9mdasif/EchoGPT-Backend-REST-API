import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({ example: 'best budget laptops 2026' })
  @IsString()
  @MinLength(1)
  query!: string;
}
