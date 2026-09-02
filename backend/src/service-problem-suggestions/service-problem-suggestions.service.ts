import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateServiceProblemSuggestionDto } from './dto/create-service-problem-suggestion.dto.js';
import { FindServiceProblemSuggestionsDto } from './dto/find-service-problem-suggestions.dto.js';
import { UpdateServiceProblemSuggestionDto } from './dto/update-service-problem-suggestion.dto.js';

const serviceProblemSuggestionSelect = {
  id: true,
  title: true,
  normalizedTitle: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.ServiceProblemSuggestionSelect;

@Injectable()
export class ServiceProblemSuggestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateServiceProblemSuggestionDto) {
    const title = this.normalizeTitleInput(createDto.title);
    const normalizedTitle = this.normalizeTitle(title);

    const existingSuggestion =
      await this.prisma.serviceProblemSuggestion.findUnique({
        where: {
          normalizedTitle,
        },
        select: {
          id: true,
          isActive: true,
          deletedAt: true,
        },
      });

    if (existingSuggestion?.isActive && !existingSuggestion.deletedAt) {
      throw new ConflictException('Já existe uma sugestão com este nome');
    }

    if (existingSuggestion) {
      return this.prisma.serviceProblemSuggestion.update({
        where: {
          id: existingSuggestion.id,
        },
        data: {
          title,
          normalizedTitle,
          description: this.optionalText(createDto.description),
          isActive: true,
          deletedAt: null,
        },
        select: serviceProblemSuggestionSelect,
      });
    }

    return this.prisma.serviceProblemSuggestion.create({
      data: {
        title,
        normalizedTitle,
        description: this.optionalText(createDto.description),
      },
      select: serviceProblemSuggestionSelect,
    });
  }

  async findAll(filters: FindServiceProblemSuggestionsDto) {
    const includeInactive = filters.includeInactive === 'true';
    const search = filters.search?.trim();

    const where: Prisma.ServiceProblemSuggestionWhereInput = {
      deletedAt: null,
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          normalizedTitle: {
            contains: this.normalizeTitle(search),
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return this.prisma.serviceProblemSuggestion.findMany({
      where,
      select: serviceProblemSuggestionSelect,
      orderBy: [
        {
          isActive: 'desc',
        },
        {
          title: 'asc',
        },
      ],
      take: 100,
    });
  }

  async findOne(id: string) {
    const suggestion = await this.prisma.serviceProblemSuggestion.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: serviceProblemSuggestionSelect,
    });

    if (!suggestion) {
      throw new NotFoundException('Sugestão de problema não encontrada');
    }

    return suggestion;
  }

  async update(id: string, updateDto: UpdateServiceProblemSuggestionDto) {
    await this.findOne(id);

    const data: Prisma.ServiceProblemSuggestionUpdateInput = {};

    if (updateDto.title !== undefined) {
      const title = this.normalizeTitleInput(updateDto.title);
      const normalizedTitle = this.normalizeTitle(title);

      const existingSuggestion =
        await this.prisma.serviceProblemSuggestion.findUnique({
          where: {
            normalizedTitle,
          },
          select: {
            id: true,
          },
        });

      if (existingSuggestion && existingSuggestion.id !== id) {
        throw new ConflictException('Já existe uma sugestão com este nome');
      }

      data.title = title;
      data.normalizedTitle = normalizedTitle;
    }

    if (updateDto.description !== undefined) {
      data.description =
        updateDto.description === null
          ? null
          : this.optionalText(updateDto.description);
    }

    if (updateDto.isActive !== undefined) {
      data.isActive = updateDto.isActive;
    }

    return this.prisma.serviceProblemSuggestion.update({
      where: {
        id,
      },
      data,
      select: serviceProblemSuggestionSelect,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.serviceProblemSuggestion.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
      select: serviceProblemSuggestionSelect,
    });
  }

  private normalizeTitleInput(value: string) {
    const title = value.trim().replace(/\s+/g, ' ');

    if (!title) {
      throw new BadRequestException('Informe o nome da sugestão');
    }

    return title;
  }

  private normalizeTitle(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  private optionalText(value?: string | null) {
    const normalized = value?.trim().replace(/\s+/g, ' ');

    return normalized || null;
  }
}
