import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AiProvidersService } from '../ai-providers/ai-providers.service.js';
import { AiProviderDto } from '../ai-providers/dto/ai-provider.dto.js';
import { CreateAiProviderDto } from '../ai-providers/dto/create-ai-provider.dto.js';
import { UpdateAiProviderDto } from '../ai-providers/dto/update-ai-provider.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { Role } from '../generated/prisma/enums.js';
import { AdminService } from './admin.service.js';
import { AdminUserQueryDto } from './dto/admin-user-query.dto.js';
import { AdminDashboardDto, AdminSystemHealthDto } from './dto/admin-dashboard.dto.js';
import { AdminSubscriptionDto, AdminSubscriptionListDto, UpdateAdminSubscriptionDto } from './dto/admin-subscription.dto.js';
import { AdminUserDto, AdminUserListDto, UpdateAdminUserDto } from './dto/admin-user.dto.js';
import { AdminLogListDto, AdminUsageAnalyticsDto } from './dto/admin-usage.dto.js';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly aiProvidersService: AiProvidersService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Aggregate dashboard statistics' })
  @ApiResponse({ status: 200, type: AdminDashboardDto })
  dashboard(): Promise<AdminDashboardDto> {
    return this.adminService.getDashboard();
  }

  @Get('system-health')
  @ApiOperation({ summary: 'DB connectivity + uptime check' })
  @ApiResponse({ status: 200, type: AdminSystemHealthDto })
  systemHealth(): Promise<AdminSystemHealthDto> {
    return this.adminService.getSystemHealth();
  }

  @Get('users')
  @ApiOperation({ summary: 'List/search users' })
  @ApiResponse({ status: 200, type: AdminUserListDto })
  listUsers(@Query() query: AdminUserQueryDto): Promise<AdminUserListDto> {
    return this.adminService.listUsers(query.page, query.limit, query.search);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: "Change a user's role, or disable/reactivate their account" })
  @ApiResponse({ status: 200, type: AdminUserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateAdminUserDto): Promise<AdminUserDto> {
    return this.adminService.updateUser(id, dto);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List all subscriptions' })
  @ApiResponse({ status: 200, type: AdminSubscriptionListDto })
  listSubscriptions(@Query() query: PaginationQueryDto): Promise<AdminSubscriptionListDto> {
    return this.adminService.listSubscriptions(query.page, query.limit);
  }

  @Patch('subscriptions/:userId')
  @ApiOperation({ summary: "Override a user's subscription (plan, status, limits)" })
  @ApiResponse({ status: 200, type: AdminSubscriptionDto })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  updateSubscription(
    @Param('userId') userId: string,
    @Body() dto: UpdateAdminSubscriptionDto,
  ): Promise<AdminSubscriptionDto> {
    return this.adminService.updateSubscription(userId, dto);
  }

  @Get('ai-providers')
  @ApiOperation({ summary: 'List global AI providers' })
  @ApiResponse({ status: 200, type: [AiProviderDto] })
  listGlobalProviders(): Promise<AiProviderDto[]> {
    return this.aiProvidersService.listGlobal();
  }

  @Post('ai-providers')
  @ApiOperation({ summary: 'Add a global AI provider (visible to every user as a fallback)' })
  @ApiResponse({ status: 201, type: AiProviderDto })
  createGlobalProvider(@Body() dto: CreateAiProviderDto): Promise<AiProviderDto> {
    return this.aiProvidersService.createGlobal(dto);
  }

  @Patch('ai-providers/:id')
  @ApiOperation({ summary: 'Edit a global AI provider' })
  @ApiResponse({ status: 200, type: AiProviderDto })
  @ApiResponse({ status: 404 })
  updateGlobalProvider(
    @Param('id') id: string,
    @Body() dto: UpdateAiProviderDto,
  ): Promise<AiProviderDto> {
    return this.aiProvidersService.updateGlobal(id, dto);
  }

  @Delete('ai-providers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a global AI provider' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404 })
  async removeGlobalProvider(@Param('id') id: string): Promise<void> {
    await this.aiProvidersService.removeGlobal(id);
  }

  @Get('usage-analytics')
  @ApiOperation({ summary: 'API usage analytics (request counts, latency, status mix, top endpoints)' })
  @ApiResponse({ status: 200, type: AdminUsageAnalyticsDto })
  usageAnalytics(): Promise<AdminUsageAnalyticsDto> {
    return this.adminService.getUsageAnalytics();
  }

  @Get('logs')
  @ApiOperation({ summary: 'Paginated raw request logs' })
  @ApiResponse({ status: 200, type: AdminLogListDto })
  logs(@Query() query: PaginationQueryDto): Promise<AdminLogListDto> {
    return this.adminService.getLogs(query.page, query.limit);
  }
}
