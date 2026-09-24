import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums.js';

export class AuthUserDto {
  @ApiProperty({ example: 'ckv2z9q4x0000abc123def456' })
  id!: string;

  @ApiProperty({ example: 'jane@example.com' })
  email!: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role!: Role;
}

export class TokenPairDto {
  @ApiProperty({ description: 'Short-lived JWT sent as a Bearer token' })
  accessToken!: string;

  @ApiProperty({
    description: 'Long-lived token used against POST /auth/refresh',
  })
  refreshToken!: string;
}

export class AuthResponseDto extends TokenPairDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}
