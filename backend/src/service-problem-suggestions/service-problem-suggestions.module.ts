import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { ServiceProblemSuggestionsController } from './service-problem-suggestions.controller.js';
import { ServiceProblemSuggestionsService } from './service-problem-suggestions.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ServiceProblemSuggestionsController],
  providers: [ServiceProblemSuggestionsService],
})
export class ServiceProblemSuggestionsModule {}
