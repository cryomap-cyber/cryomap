import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ThermalAlertStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FindThermalAlertsDto } from './dto/find-thermal-alerts.dto.js';

const thermalAlertSelect = {
  id: true,
  companyId: true,
  roomId: true,
  sensorId: true,
  readingId: true,
  acknowledgedByUserId: true,
  type: true,
  severity: true,
  status: true,
  temperature: true,
  minTemperature: true,
  maxTemperature: true,
  message: true,
  triggeredAt: true,
  acknowledgedAt: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
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
      minTemperature: true,
      maxTemperature: true,
    },
  },
  sensor: {
    select: {
      id: true,
      code: true,
      status: true,
      lastTemperature: true,
      lastHumidity: true,
      lastSeenAt: true,
    },
  },
  reading: {
    select: {
      id: true,
      temperature: true,
      humidity: true,
      source: true,
      readAt: true,
    },
  },
  acknowledgedByUser: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  },
} satisfies Prisma.ThermalAlertSelect;

@Injectable()
export class ThermalAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FindThermalAlertsDto) {
    const where: Prisma.ThermalAlertWhereInput = {
      deletedAt: null,
    };

    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.roomId) {
      where.roomId = filters.roomId;
    }

    if (filters.sensorId) {
      where.sensorId = filters.sensorId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.severity) {
      where.severity = filters.severity;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.triggeredAt = {};

      if (filters.startDate) {
        where.triggeredAt.gte = this.parseDate(
          filters.startDate,
          'Data inicial inválida',
        );
      }

      if (filters.endDate) {
        where.triggeredAt.lte = this.parseDate(
          filters.endDate,
          'Data final inválida',
        );
      }
    }

    return this.prisma.thermalAlert.findMany({
      where,
      select: thermalAlertSelect,
      orderBy: {
        triggeredAt: 'desc',
      },
      take: 200,
    });
  }

  async findOne(id: string) {
    const alert = await this.prisma.thermalAlert.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: thermalAlertSelect,
    });

    if (!alert) {
      throw new NotFoundException('Alerta térmico não encontrado');
    }

    return alert;
  }

  async acknowledge(id: string, userId?: string) {
    await this.findOne(id);

    return this.prisma.thermalAlert.update({
      where: {
        id,
      },
      data: {
        status: ThermalAlertStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
        acknowledgedByUser: userId
          ? {
              connect: {
                id: userId,
              },
            }
          : undefined,
      },
      select: thermalAlertSelect,
    });
  }

  async resolve(id: string) {
    await this.findOne(id);

    return this.prisma.thermalAlert.update({
      where: {
        id,
      },
      data: {
        status: ThermalAlertStatus.RESOLVED,
        resolvedAt: new Date(),
      },
      select: thermalAlertSelect,
    });
  }

  async dismiss(id: string) {
    await this.findOne(id);

    return this.prisma.thermalAlert.update({
      where: {
        id,
      },
      data: {
        status: ThermalAlertStatus.DISMISSED,
        resolvedAt: new Date(),
      },
      select: thermalAlertSelect,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.thermalAlert.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
      select: thermalAlertSelect,
    });
  }

  private parseDate(value: string, errorMessage: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(errorMessage);
    }

    return date;
  }
}
