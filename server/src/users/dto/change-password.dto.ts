import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentPassw0rd!' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'NewStrongPassw0rd!', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
