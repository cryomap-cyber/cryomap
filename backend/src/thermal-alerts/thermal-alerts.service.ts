import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AuthUser } from '../auth/types/auth-user.type.js';
import {
  Prisma,
  ThermalAlertStatus,
  UserRole,
} from '../generated/prisma/client.js';
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

  async findAll(filters: FindThermalAlertsDto, actor: AuthUser) {
    const where: Prisma.ThermalAlertWhereInput = {
      deletedAt: null,
    };

    const scopedCompanyId = this.resolveReadCompanyId(filters.companyId, actor);

    if (scopedCompanyId) {
      where.companyId = scopedCompanyId;
    }

    if (filters.roomId) {
      await this.ensureRoomCanBeUsed(filters.roomId, scopedCompanyId, actor);
      where.roomId = filters.roomId;
    }

    if (filters.sensorId) {
      await this.ensureSensorCanBeUsed(
        filters.sensorId,
        scopedCompanyId,
        filters.roomId,
        actor,
      );
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
      const triggeredAtFilter: Prisma.DateTimeFilter = {};

      if (filters.startDate) {
        triggeredAtFilter.gte = this.parseDate(
          filters.startDate,
          'Data inicial inválida',
        );
      }

      if (filters.endDate) {
        triggeredAtFilter.lte = this.parseDate(
          filters.endDate,
          'Data final inválida',
        );
      }

      where.triggeredAt = triggeredAtFilter;
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

  async findOne(id: string, actor: AuthUser) {
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

    this.ensureCanAccessCompany(alert.companyId, actor);

    return alert;
  }

  async acknowledge(id: string, actor: AuthUser) {
    this.ensureCanWrite(actor);

    await this.findOne(id, actor);

    return this.prisma.thermalAlert.update({
      where: {
        id,
      },
      data: {
        status: ThermalAlertStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
        acknowledgedByUser: {
          connect: {
            id: actor.id,
          },
        },
      },
      select: thermalAlertSelect,
    });
  }

  async resolve(id: string, actor: AuthUser) {
    this.ensureCanWrite(actor);

    await this.findOne(id, actor);

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

  async dismiss(id: string, actor: AuthUser) {
    this.ensureCanWrite(actor);

    await this.findOne(id, actor);

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

  async remove(id: string, actor: AuthUser) {
    this.ensureCanWrite(actor);

    await this.findOne(id, actor);

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

  private ensureCanWrite(actor: AuthUser) {
    if (actor.role === UserRole.CLIENT_USER) {
      throw new ForbiddenException(
        'Usuário cliente não pode alterar alertas térmicos',
      );
    }

    if (actor.role === UserRole.TECHNICIAN && !actor.companyId) {
      throw new ForbiddenException('Técnico não está vinculado a uma empresa');
    }
  }

  private resolveReadCompanyId(
    requestedCompanyId: string | undefined,
    actor: AuthUser,
  ) {
    if (
      actor.role === UserRole.CLIENT_USER ||
      actor.role === UserRole.TECHNICIAN
    ) {
      if (!actor.companyId) {
        throw new ForbiddenException(
          'Usuário não está vinculado a uma empresa',
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

  private async ensureRoomCanBeUsed(
    roomId: string,
    scopedCompanyId: string | undefined,
    actor: AuthUser,
  ) {
    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        deletedAt: null,
      },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Sala não encontrada');
    }

    this.ensureCanAccessCompany(room.companyId, actor);

    if (scopedCompanyId && room.companyId !== scopedCompanyId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta sala',
      );
    }
  }

  private async ensureSensorCanBeUsed(
    sensorId: string,
    scopedCompanyId: string | undefined,
    roomId: string | undefined,
    actor: AuthUser,
  ) {
    const sensor = await this.prisma.sensor.findFirst({
      where: {
        id: sensorId,
        deletedAt: null,
      },
      select: {
        id: true,
        companyId: true,
        roomId: true,
      },
    });

    if (!sensor) {
      throw new NotFoundException('Sensor não encontrado');
    }

    this.ensureCanAccessCompany(sensor.companyId, actor);

    if (scopedCompanyId && sensor.companyId !== scopedCompanyId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este sensor',
      );
    }

    if (roomId && sensor.roomId !== roomId) {
      throw new BadRequestException(
        'O sensor informado não pertence à sala informada',
      );
    }
  }

  private parseDate(value: string, errorMessage: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(errorMessage);
    }

    return date;
  }
}
