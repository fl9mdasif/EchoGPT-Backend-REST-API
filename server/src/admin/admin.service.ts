import { Injectable, NotFoundException } from '@nestjs/common';
import { toSkipTake } from '../common/pagination.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AdminDashboardDto, AdminSystemHealthDto } from './dto/admin-dashboard.dto.js';
import type { AdminSubscriptionDto, AdminSubscriptionListDto, UpdateAdminSubscriptionDto } from './dto/admin-subscription.dto.js';
import type { AdminUserDto, AdminUserListDto, UpdateAdminUserDto } from './dto/admin-user.dto.js';
import type { AdminLogListDto, AdminUsageAnalyticsDto } from './dto/admin-usage.dto.js';

const TOP_ENDPOINTS_LIMIT = 5;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<AdminDashboardDto> {
    const since24h = new Date(Date.now() - ONE_DAY_MS);

    const [
      totalUsers,
      activeAdmins,
      premiumSubscriptions,
      freeSubscriptions,
      totalConversations,
      totalMessages,
      totalSearches,
      requestsLast24h,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { role: 'ADMIN', deletedAt: null } }),
      this.prisma.subscription.count({ where: { plan: 'PREMIUM' } }),
      this.prisma.subscription.count({ where: { plan: 'FREE' } }),
      this.prisma.conversation.count(),
      this.prisma.message.count(),
      this.prisma.searchQuery.count(),
      this.prisma.apiUsageLog.count({ where: { createdAt: { gte: since24h } } }),
    ]);

    return {
      totalUsers,
      activeAdmins,
      premiumSubscriptions,
      freeSubscriptions,
      totalConversations,
      totalMessages,
      totalSearches,
      requestsLast24h,
    };
  }

  async getSystemHealth(): Promise<AdminSystemHealthDto> {
    let databaseConnected = true;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseConnected = false;
    }

    return {
      status: databaseConnected ? 'ok' : 'degraded',
      databaseConnected,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  async listUsers(page: number, limit: number, search?: string): Promise<AdminUserListDto> {
    const { skip, take } = toSkipTake(page, limit);
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isEmailVerified: u.isEmailVerified,
        isActive: u.deletedAt === null,
        createdAt: u.createdAt,
      })),
      meta: { page, limit, total },
    };
  }

  async updateUser(id: string, dto: UpdateAdminUserDto): Promise<AdminUserDto> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        role: dto.role,
        deletedAt: dto.isActive === undefined ? undefined : dto.isActive ? null : new Date(),
      },
    });

    if (dto.isActive === false) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.deletedAt === null,
      createdAt: user.createdAt,
    };
  }

  async listSubscriptions(page: number, limit: number): Promise<AdminSubscriptionListDto> {
    const { skip, take } = toSkipTake(page, limit);
    const [subscriptions, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { user: { select: { email: true } } },
      }),
      this.prisma.subscription.count(),
    ]);

    return {
      data: subscriptions.map((s) => ({
        id: s.id,
        userId: s.userId,
        userEmail: s.user.email,
        plan: s.plan,
        status: s.status,
        requestsUsed: s.requestsUsed,
        requestsLimit: s.requestsLimit,
        renewsAt: s.renewsAt,
      })),
      meta: { page, limit, total },
    };
  }

  async updateSubscription(userId: string, dto: UpdateAdminSubscriptionDto): Promise<AdminSubscriptionDto> {
    const existing = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!existing) throw new NotFoundException('Subscription not found');

    const subscription = await this.prisma.subscription.update({
      where: { userId },
      data: {
        plan: dto.plan,
        status: dto.status,
        requestsLimit: dto.requestsLimit,
        requestsUsed: dto.requestsUsed,
      },
      include: { user: { select: { email: true } } },
    });

    return {
      id: subscription.id,
      userId: subscription.userId,
      userEmail: subscription.user.email,
      plan: subscription.plan,
      status: subscription.status,
      requestsUsed: subscription.requestsUsed,
      requestsLimit: subscription.requestsLimit,
      renewsAt: subscription.renewsAt,
    };
  }

  async getUsageAnalytics(): Promise<AdminUsageAnalyticsDto> {
    const since24h = new Date(Date.now() - ONE_DAY_MS);

    const [totalRequests, requestsLast24h, avgLatency, statusRows, endpointRows] = await Promise.all([
      this.prisma.apiUsageLog.count(),
      this.prisma.apiUsageLog.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.apiUsageLog.aggregate({ _avg: { latencyMs: true } }),
      this.prisma.apiUsageLog.findMany({ select: { statusCode: true } }),
      this.prisma.apiUsageLog.groupBy({
        by: ['endpoint'],
        _count: { endpoint: true },
        orderBy: { _count: { endpoint: 'desc' } },
        take: TOP_ENDPOINTS_LIMIT,
      }),
    ]);

    const byStatusClass: Record<string, number> = {};
    for (const row of statusRows) {
      const bucket = `${Math.floor(row.statusCode / 100)}xx`;
      byStatusClass[bucket] = (byStatusClass[bucket] ?? 0) + 1;
    }

    return {
      totalRequests,
      requestsLast24h,
      averageLatencyMs: Math.round((avgLatency._avg.latencyMs ?? 0) * 100) / 100,
      byStatusClass,
      topEndpoints: endpointRows.map((row) => ({ endpoint: row.endpoint, count: row._count.endpoint })),
    };
  }

  async getLogs(page: number, limit: number): Promise<AdminLogListDto> {
    const { skip, take } = toSkipTake(page, limit);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.apiUsageLog.findMany({ orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.apiUsageLog.count(),
    ]);
    return { data, meta: { page, limit, total } };
  }
}
