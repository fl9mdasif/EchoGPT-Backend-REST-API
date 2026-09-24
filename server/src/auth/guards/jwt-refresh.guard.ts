import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Applied explicitly on /auth/refresh and /auth/logout, which take the refresh token in the body. */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
