import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums.js';

export class UserProfileDto {
  @ApiProperty({ example: 'ckv2z9q4x0000abc123def456' })
  id!: string;

  @ApiProperty({ example: 'jane@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'Jane Doe', nullable: true })
  name!: string | null;

  @ApiProperty({ enum: Role, example: Role.USER })
  role!: Role;

  @ApiProperty()
  isEmailVerified!: boolean;

  @ApiProperty()
  createdAt!: Date;
}
