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
import { UpdateEquipmentTemperatureReadingDto } from './dto/update-equipment-temperature-reading.dto.js';

const equipmentTemperatureReadingSelect = {
  id: true,
  companyId: true,
  roomId: true,
  equipmentId: true,
  createdByUserId: true,
  temperature: true,
  dischargePressure: true,
  suctionPressure: true,
  liquidLineTemperature: true,
  evaporationTemperature: true,
  superheating: true,
  subcooling: true,
  airFlow: true,
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
      refrigerantFluid: true,
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
          dischargePressure: createDto.dischargePressure,
          suctionPressure: createDto.suctionPressure,
          liquidLineTemperature: createDto.liquidLineTemperature,
          evaporationTemperature: createDto.evaporationTemperature,
          superheating: createDto.superheating,
          subcooling: createDto.subcooling,
          airFlow: createDto.airFlow,
          source: createDto.source ?? EquipmentTemperatureSource.MANUAL,
          notes: this.optionalText(createDto.notes),
          measuredAt,
        },
        select: equipmentTemperatureReadingSelect,
      });

      await this.recalculateEquipmentCurrentTemperature(
        tx,
        createDto.equipmentId,
      );

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

  async update(
    id: string,
    updateDto: UpdateEquipmentTemperatureReadingDto,
    actor: AuthUser,
  ) {
    this.ensureCanManageMeasurements(actor);

    const existingReading =
      await this.prisma.equipmentTemperatureReading.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          companyId: true,
          equipmentId: true,
        },
      });

    if (!existingReading) {
      throw new NotFoundException('Leitura de equipamento não encontrada');
    }

    const targetCompanyId = updateDto.companyId ?? existingReading.companyId;
    const targetEquipmentId =
      updateDto.equipmentId ?? existingReading.equipmentId;

    const equipment = await this.ensureEquipmentExists(
      targetEquipmentId,
      targetCompanyId,
    );

    const measuredAt = this.parseOptionalMeasuredAt(updateDto.measuredAt);

    return this.prisma.$transaction(async (tx) => {
      const reading = await tx.equipmentTemperatureReading.update({
        where: {
          id,
        },
        data: {
          companyId: targetCompanyId,
          roomId: equipment.roomId,
          equipmentId: targetEquipmentId,
          temperature: updateDto.temperature,
          dischargePressure: updateDto.dischargePressure,
          suctionPressure: updateDto.suctionPressure,
          liquidLineTemperature: updateDto.liquidLineTemperature,
          evaporationTemperature: updateDto.evaporationTemperature,
          superheating: updateDto.superheating,
          subcooling: updateDto.subcooling,
          airFlow: updateDto.airFlow,
          source: updateDto.source,
          notes:
            updateDto.notes === undefined
              ? undefined
              : this.optionalText(updateDto.notes),
          measuredAt,
        },
        select: equipmentTemperatureReadingSelect,
      });

      await this.recalculateEquipmentCurrentTemperature(
        tx,
        existingReading.equipmentId,
      );

      if (existingReading.equipmentId !== targetEquipmentId) {
        await this.recalculateEquipmentCurrentTemperature(
          tx,
          targetEquipmentId,
        );
      }

      return reading;
    });
  }

  async remove(id: string, actor: AuthUser) {
    this.ensureCanManageMeasurements(actor);

    const existingReading =
      await this.prisma.equipmentTemperatureReading.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          equipmentId: true,
        },
      });

    if (!existingReading) {
      throw new NotFoundException('Leitura de equipamento não encontrada');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.equipmentTemperatureReading.delete({
        where: {
          id,
        },
      });

      await this.recalculateEquipmentCurrentTemperature(
        tx,
        existingReading.equipmentId,
      );
    });

    return {
      message: 'Medição de equipamento removida com sucesso',
    };
  }

  private resolveCreateCompanyId(
    createDto: CreateEquipmentTemperatureReadingDto,
    actor: AuthUser,
  ) {
    if (actor.role === UserRole.CLIENT_USER) {
      throw new ForbiddenException(
        'Usuário cliente não pode criar medições técnicas de equipamentos',
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
          'Técnico só pode registrar medição de equipamento da própria empresa',
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
      if (!actor.companyId) {
        throw new ForbiddenException(
          'Usuário cliente não está vinculado a uma empresa',
        );
      }

      return actor.companyId;
    }

    if (actor.role === UserRole.TECHNICIAN) {
      if (!actor.companyId) {
        throw new ForbiddenException(
          'Técnico não está vinculado a uma empresa',
        );
      }

      return actor.companyId;
    }

    return requestedCompanyId;
  }

  private ensureCanAccessCompany(companyId: string, actor: AuthUser) {
    if (
      actor.role !== UserRole.CLIENT_USER &&
      actor.role !== UserRole.TECHNICIAN
    ) {
      return;
    }

    if (!actor.companyId || actor.companyId !== companyId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta empresa',
      );
    }
  }

  private ensureCanManageMeasurements(actor: AuthUser) {
    if (actor.role !== UserRole.MASTER_ADMIN) {
      throw new ForbiddenException(
        'Somente o administrador master pode editar ou remover medições de equipamentos',
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

  private parseOptionalMeasuredAt(value?: string) {
    if (value === undefined) {
      return undefined;
    }

    const measuredAt = new Date(value);

    if (Number.isNaN(measuredAt.getTime())) {
      throw new BadRequestException('Data da medição inválida');
    }

    return measuredAt;
  }

  private optionalText(value?: string | null) {
    const normalized = value?.trim();

    return normalized || null;
  }

  private async recalculateEquipmentCurrentTemperature(
    tx: Prisma.TransactionClient,
    equipmentId: string,
  ) {
    const latestReading = await tx.equipmentTemperatureReading.findFirst({
      where: {
        equipmentId,
      },
      select: {
        temperature: true,
      },
      orderBy: [
        {
          measuredAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });

    await tx.equipment.update({
      where: {
        id: equipmentId,
      },
      data: {
        currentTemperature: latestReading?.temperature ?? null,
      },
    });
  }
}
