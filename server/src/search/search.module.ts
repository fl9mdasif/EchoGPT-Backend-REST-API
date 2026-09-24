import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { SearchAdapterService } from './search-adapter.service.js';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';

@Module({
  imports: [SubscriptionsModule],
  controllers: [SearchController],
  providers: [SearchService, SearchAdapterService],
})
export class SearchModule {}
