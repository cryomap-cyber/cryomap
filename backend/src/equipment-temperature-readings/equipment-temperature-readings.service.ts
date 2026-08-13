import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AuthUser } from '../auth/types/auth-user.type.js';
import {
  EquipmentTemperatureSource,
  Prisma,
  UserRole,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEquipmentTemperatureReadingDto } from './dto/create-equipment-temperature-reading.dto.js';
import { FindEquipmentTemperatureReadingsDto } from './dto/find-equipment-temperature-readings.dto.js';

const equipmentTemperatureReadingSelect = {
  id: true,
  companyId: true,
  roomId: true,
  equipmentId: true,
  createdByUserId: true,
  temperature: true,
  source: true,
  notes: true,
  measuredAt: true,
  createdAt: true,
  company: {
    select: {
      id: true,
      name: true,
      cnpj: true,
      status: true,
    },
  },
  room: {
    select: {
      id: true,
      name: true,
      thermalStatus: true,
      currentTemperature: true,
    },
  },
  equipment: {
    select: {
      id: true,
      name: true,
      code: true,
      currentTemperature: true,
      status: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  },
} satisfies Prisma.EquipmentTemperatureReadingSelect;

@Injectable()
export class EquipmentTemperatureReadingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createDto: CreateEquipmentTemperatureReadingDto,
    actor: AuthUser,
  ) {
    const companyId = this.resolveCreateCompanyId(createDto, actor);

    const equipment = await this.ensureEquipmentExists(
      createDto.equipmentId,
      companyId,
    );

    const measuredAt = createDto.measuredAt
      ? new Date(createDto.measuredAt)
      : new Date();

    if (Number.isNaN(measuredAt.getTime())) {
      throw new BadRequestException('Data da medição inválida');
    }

    return this.prisma.$transaction(async (tx) => {
      const reading = await tx.equipmentTemperatureReading.create({
        data: {
          companyId,
          roomId: equipment.roomId,
          equipmentId: createDto.equipmentId,
          createdByUserId: actor.id,
          temperature: createDto.temperature,
          source: createDto.source ?? EquipmentTemperatureSource.MANUAL,
          notes: createDto.notes?.trim(),
          measuredAt,
        },
        select: equipmentTemperatureReadingSelect,
      });

      await tx.equipment.update({
        where: {
          id: createDto.equipmentId,
        },
        data: {
          currentTemperature: createDto.temperature,
        },
      });

      return reading;
    });
  }

  async findAll(filters: FindEquipmentTemperatureReadingsDto, actor: AuthUser) {
    const where: Prisma.EquipmentTemperatureReadingWhereInput = {};

    const scopedCompanyId = this.resolveReadCompanyId(filters.companyId, actor);

    if (scopedCompanyId) {
      where.companyId = scopedCompanyId;
    }

    if (filters.roomId) {
      where.roomId = filters.roomId;
    }

    if (filters.equipmentId) {
      where.equipmentId = filters.equipmentId;
    }

    if (filters.createdByUserId) {
      where.createdByUserId = filters.createdByUserId;
    }

    if (filters.startDate || filters.endDate) {
      where.measuredAt = {};

      if (filters.startDate) {
        const startDate = new Date(filters.startDate);

        if (Number.isNaN(startDate.getTime())) {
          throw new BadRequestException('Data inicial inválida');
        }

        where.measuredAt.gte = startDate;
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);

        if (Number.isNaN(endDate.getTime())) {
          throw new BadRequestException('Data final inválida');
        }

        where.measuredAt.lte = endDate;
      }
    }

    return this.prisma.equipmentTemperatureReading.findMany({
      where,
      select: equipmentTemperatureReadingSelect,
      orderBy: {
        measuredAt: 'desc',
      },
      take: 200,
    });
  }

  async findOne(id: string, actor: AuthUser) {
    const reading = await this.prisma.equipmentTemperatureReading.findUnique({
      where: {
        id,
      },
      select: equipmentTemperatureReadingSelect,
    });

    if (!reading) {
      throw new NotFoundException('Leitura de equipamento não encontrada');
    }

    this.ensureCanAccessCompany(reading.companyId, actor);

    return reading;
  }

  private resolveCreateCompanyId(
    createDto: CreateEquipmentTemperatureReadingDto,
    actor: AuthUser,
  ) {
    if (actor.role === UserRole.CLIENT_USER) {
      throw new ForbiddenException(
        'Usuário cliente não pode acessar leituras manuais de equipamentos',
      );
    }

    if (actor.role === UserRole.TECHNICIAN) {
      if (!actor.companyId) {
        throw new ForbiddenException(
          'Técnico não está vinculado a uma empresa',
        );
      }

      if (createDto.companyId !== actor.companyId) {
        throw new ForbiddenException(
          'Técnico só pode registrar leitura de equipamento da própria empresa',
        );
      }

      return actor.companyId;
    }

    return createDto.companyId;
  }

  private resolveReadCompanyId(
    requestedCompanyId: string | undefined,
    actor: AuthUser,
  ) {
    if (actor.role === UserRole.CLIENT_USER) {
      throw new ForbiddenException(
        'Usuário cliente não pode acessar leituras manuais de equipamentos',
      );
    }

    if (actor.role === UserRole.TECHNICIAN) {
      return actor.companyId ?? undefined;
    }

    return requestedCompanyId;
  }

  private ensureCanAccessCompany(companyId: string, actor: AuthUser) {
    if (actor.role === UserRole.CLIENT_USER) {
      throw new ForbiddenException(
        'Usuário cliente não pode acessar leituras manuais de equipamentos',
      );
    }

    if (actor.role !== UserRole.TECHNICIAN) {
      return;
    }

    if (!actor.companyId || actor.companyId !== companyId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta empresa',
      );
    }
  }

  private async ensureEquipmentExists(equipmentId: string, companyId: string) {
    const equipment = await this.prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        companyId,
        deletedAt: null,
      },
      select: {
        id: true,
        companyId: true,
        roomId: true,
      },
    });

    if (!equipment) {
      throw new NotFoundException('Equipamento não encontrado');
    }

    return equipment;
  }
}
