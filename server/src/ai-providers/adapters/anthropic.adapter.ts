import { Injectable } from '@nestjs/common';
import { ProviderType } from '../../generated/prisma/enums.js';
import { MockProviderAdapterBase } from './mock-provider-adapter.base.js';

@Injectable()
export class AnthropicAdapter extends MockProviderAdapterBase {
  readonly type = ProviderType.ANTHROPIC;
  protected readonly label = 'Anthropic';
}
