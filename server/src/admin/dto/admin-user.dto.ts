import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../generated/prisma/enums.js';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto.js';

export class AdminUserDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional({ nullable: true }) name!: string | null;
  @ApiProperty({ enum: Role }) role!: Role;
  @ApiProperty() isEmailVerified!: boolean;
  @ApiProperty({
    description: 'false means the account is soft-deleted/disabled',
  })
  isActive!: boolean;
  @ApiProperty() createdAt!: Date;
}

export class AdminUserListDto {
  @ApiProperty({ type: [AdminUserDto] })
  data!: AdminUserDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class UpdateAdminUserDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    description: 'Set false to disable the account, true to reactivate it',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
