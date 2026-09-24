import type { Role } from '../../generated/prisma/enums.js';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
}

export interface CurrentUserPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface RefreshTokenContext {
  userId: string;
  tokenId: string;
  rawToken: string;
}
