import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { CurrentUserPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { AiProvidersService } from './ai-providers.service.js';
import { AiProviderDto, ProviderHealthDto } from './dto/ai-provider.dto.js';
import { CreateAiProviderDto } from './dto/create-ai-provider.dto.js';
import { UpdateAiProviderDto } from './dto/update-ai-provider.dto.js';

@ApiTags('ai-providers')
@ApiBearerAuth()
@Controller('ai-providers')
export class AiProvidersController {
  constructor(private readonly aiProvidersService: AiProvidersService) {}

  @Get()
  @ApiOperation({ summary: 'List your providers plus enabled global providers' })
  @ApiResponse({ status: 200, type: [AiProviderDto] })
  list(@CurrentUser() user: CurrentUserPayload): Promise<AiProviderDto[]> {
    return this.aiProvidersService.listForUser(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a provider (OpenAI/Anthropic/Gemini) with an API key' })
  @ApiResponse({ status: 201, type: AiProviderDto })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAiProviderDto,
  ): Promise<AiProviderDto> {
    return this.aiProvidersService.create(user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a provider: rename, rotate its key, enable/disable, or set as default',
  })
  @ApiResponse({ status: 200, type: AiProviderDto })
  @ApiResponse({ status: 404, description: 'Not found, or not owned by you' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAiProviderDto,
  ): Promise<AiProviderDto> {
    return this.aiProvidersService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a provider you own' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Not found, or not owned by you' })
  async remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string): Promise<void> {
    await this.aiProvidersService.remove(user.userId, id);
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Ping a provider to check it is reachable' })
  @ApiResponse({ status: 200, type: ProviderHealthDto })
  @ApiResponse({ status: 404, description: 'Not found, or not visible to you' })
  healthCheck(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<ProviderHealthDto> {
    return this.aiProvidersService.healthCheck(user.userId, id);
  }
}
