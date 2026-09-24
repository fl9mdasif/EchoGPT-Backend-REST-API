import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type {
  JwtRefreshPayload,
  RefreshTokenContext,
} from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.refreshSecret')!,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtRefreshPayload): RefreshTokenContext {
    const rawToken = (req.body as { refreshToken?: string })?.refreshToken;
    return { userId: payload.sub, tokenId: payload.jti, rawToken: rawToken! };
  }
}
