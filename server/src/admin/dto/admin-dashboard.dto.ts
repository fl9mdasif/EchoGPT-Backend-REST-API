import { ApiProperty } from '@nestjs/swagger';

export class AdminDashboardDto {
  @ApiProperty({ example: 128 }) totalUsers!: number;
  @ApiProperty({ example: 5 }) activeAdmins!: number;
  @ApiProperty({ example: 21 }) premiumSubscriptions!: number;
  @ApiProperty({ example: 107 }) freeSubscriptions!: number;
  @ApiProperty({ example: 342 }) totalConversations!: number;
  @ApiProperty({ example: 1893 }) totalMessages!: number;
  @ApiProperty({ example: 256 }) totalSearches!: number;
  @ApiProperty({ example: 412 }) requestsLast24h!: number;
}

export class AdminSystemHealthDto {
  @ApiProperty() status!: 'ok' | 'degraded';
  @ApiProperty() databaseConnected!: boolean;
  @ApiProperty() uptimeSeconds!: number;
  @ApiProperty() timestamp!: string;
}
