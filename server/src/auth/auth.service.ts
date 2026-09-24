import { randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../generated/prisma/client.js';
import type { Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthResponseDto, AuthUserDto, TokenPairDto } from './dto/auth-response.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { hashToken } from './utils/hash-token.util.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const emailVerificationToken = randomBytes(32).toString('hex');

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          emailVerificationToken,
          subscription: { create: {} },
        },
      });

      // Bonus "email verification" feature — no mail provider wired up, so the
      // link is logged instead of sent. See docs/prd.md §3.1.
      this.logger.log(
        `Verification link for ${user.email}: /api/v1/auth/verify-email?token=${emailVerificationToken}`,
      );

      const tokens = await this.issueTokenPair(user.id, user.email, user.role);
      return { user: this.toPublicUser(user.id, user.email, user.role), ...tokens };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokenPair(user.id, user.email, user.role);
    return { user: this.toPublicUser(user.id, user.email, user.role), ...tokens };
  }

  async refresh(userId: string, tokenId: string, rawToken: string): Promise<TokenPairDto> {
    const record = await this.prisma.refreshToken.findUnique({ where: { id: tokenId } });

    const isValid =
      record &&
      record.userId === userId &&
      !record.revokedAt &&
      record.expiresAt > new Date() &&
      record.tokenHash === hashToken(rawToken);

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotation: revoke the token being used, issue a brand new pair.
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User no longer exists');
    }

    return this.issueTokenPair(user.id, user.email, user.role);
  }

  async logout(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id: tokenId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { emailVerificationToken: token } });
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerificationToken: null },
    });
  }

  private async issueTokenPair(userId: string, email: string, role: Role): Promise<TokenPairDto> {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, role },
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn') as JwtSignOptions['expiresIn'],
      },
    );

    const tokenId = randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, jti: tokenId },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn') as JwtSignOptions['expiresIn'],
      },
    );

    const decoded = this.jwtService.decode<{ exp: number }>(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(decoded.exp * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private toPublicUser(id: string, email: string, role: Role): AuthUserDto {
    return { id, email, role };
  }
}
