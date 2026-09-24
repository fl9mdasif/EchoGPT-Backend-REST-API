import { Injectable } from '@nestjs/common';
import { ProviderType } from '../../generated/prisma/enums.js';
import { MockProviderAdapterBase } from './mock-provider-adapter.base.js';

@Injectable()
export class GeminiAdapter extends MockProviderAdapterBase {
  readonly type = ProviderType.GEMINI;
  protected readonly label = 'Gemini';
}
