import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EquipmentTemperatureSource,
  Prisma,
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
    createdByUserId?: string,
  ) {
    const equipment = await this.ensureEquipmentExists(
      createDto.equipmentId,
      createDto.companyId,
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
          companyId: createDto.companyId,
          roomId: equipment.roomId,
          equipmentId: createDto.equipmentId,
          createdByUserId,
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

  async findAll(filters: FindEquipmentTemperatureReadingsDto) {
    const where: Prisma.EquipmentTemperatureReadingWhereInput = {};

    if (filters.companyId) {
      where.companyId = filters.companyId;
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

  async findOne(id: string) {
    const reading = await this.prisma.equipmentTemperatureReading.findUnique({
      where: {
        id,
      },
      select: equipmentTemperatureReadingSelect,
    });

    if (!reading) {
      throw new NotFoundException('Leitura de equipamento não encontrada');
    }

    return reading;
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
