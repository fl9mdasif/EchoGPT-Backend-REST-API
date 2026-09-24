import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { UserProfileDto } from './dto/user-profile.dto.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.findActiveUserOrThrow(userId);
    return this.toProfileDto(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileDto> {
    await this.findActiveUserOrThrow(userId);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name },
    });
    return this.toProfileDto(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findActiveUserOrThrow(userId);

    const currentMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    // Changing the password invalidates every other session: revoke all
    // outstanding refresh tokens so a stolen one can't outlive this change.
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.findActiveUserOrThrow(userId);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private async findActiveUserOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private toProfileDto(user: {
    id: string;
    email: string;
    name: string | null;
    role: UserProfileDto['role'];
    isEmailVerified: boolean;
    createdAt: Date;
  }): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };
  }
}
