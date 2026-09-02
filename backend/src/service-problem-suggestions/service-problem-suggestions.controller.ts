import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { UserRole } from '../generated/prisma/client.js';
import { CreateServiceProblemSuggestionDto } from './dto/create-service-problem-suggestion.dto.js';
import { FindServiceProblemSuggestionsDto } from './dto/find-service-problem-suggestions.dto.js';
import { UpdateServiceProblemSuggestionDto } from './dto/update-service-problem-suggestion.dto.js';
import { ServiceProblemSuggestionsService } from './service-problem-suggestions.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('service-problem-suggestions')
export class ServiceProblemSuggestionsController {
  constructor(
    private readonly serviceProblemSuggestionsService: ServiceProblemSuggestionsService,
  ) {}

  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPERVISOR,
    UserRole.CLIENT_USER,
    UserRole.TECHNICIAN,
  )
  @Get()
  findAll(@Query() filters: FindServiceProblemSuggestionsDto) {
    return this.serviceProblemSuggestionsService.findAll(filters);
  }

  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPERVISOR,
    UserRole.CLIENT_USER,
    UserRole.TECHNICIAN,
  )
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serviceProblemSuggestionsService.findOne(id);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR)
  @Post()
  create(@Body() createDto: CreateServiceProblemSuggestionDto) {
    return this.serviceProblemSuggestionsService.create(createDto);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceProblemSuggestionDto,
  ) {
    return this.serviceProblemSuggestionsService.update(id, updateDto);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.serviceProblemSuggestionsService.remove(id);
  }
}
