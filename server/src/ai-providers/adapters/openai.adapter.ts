import { Injectable } from '@nestjs/common';
import { ProviderType } from '../../generated/prisma/enums.js';
import { MockProviderAdapterBase } from './mock-provider-adapter.base.js';

@Injectable()
export class OpenAiAdapter extends MockProviderAdapterBase {
  readonly type = ProviderType.OPENAI;
  protected readonly label = 'OpenAI';
}
