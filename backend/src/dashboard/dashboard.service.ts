import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AuthUser } from '../auth/types/auth-user.type.js';
import {
  EquipmentStatus,
  SensorStatus,
  TaskPriority,
  TaskStatus,
  ThermalAlertSeverity,
  ThermalAlertStatus,
  ThermalStatus,
  UserRole,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DashboardQueryDto } from './dto/dashboard-query.dto.js';

type CompanyFilter = {
  companyId?: string;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(query: DashboardQueryDto, actor: AuthUser) {
    const companyId = this.resolveCompanyScope(query.companyId, actor);

    if (companyId) {
      await this.ensureCompanyExists(companyId);
    }

    const companyFilter: CompanyFilter = companyId
      ? {
          companyId,
        }
      : {};

    const companyWhere = companyId
      ? {
          id: companyId,
          deletedAt: null,
        }
      : {
          deletedAt: null,
        };

    const [
      companies,
      rooms,
      sensors,
      equipments,
      tasks,
      thermalAlerts,
      activeThermalAlertRooms,
      recentThermalAlerts,
      recentServiceRecords,
      latestRoomTemperatureReadings,
    ] = await Promise.all([
      this.getCompaniesSummary(companyWhere),
      this.getRoomsSummary(companyFilter),
      this.getSensorsSummary(companyFilter),
      this.getEquipmentsSummary(companyFilter),
      this.getTasksSummary(companyFilter),
      this.getThermalAlertsSummary(companyFilter),
      this.getActiveThermalAlertRooms(companyFilter),
      this.getRecentThermalAlerts(companyFilter),
      this.getRecentServiceRecords(companyFilter),
      this.getLatestRoomTemperatureReadings(companyFilter),
    ]);

    return {
      generatedAt: new Date(),
      filters: {
        companyId: companyId ?? null,
      },
      companies,
      rooms,
      sensors,
      equipments,
      tasks,
      thermalAlerts,
      activeThermalAlertRooms,
      recentThermalAlerts,
      recentServiceRecords,
      latestRoomTemperatureReadings,
    };
  }

  private async getCompaniesSummary(where: { id?: string; deletedAt: null }) {
    const [total, active, inactive] = await Promise.all([
      this.prisma.company.count({
        where,
      }),
      this.prisma.company.count({
        where: {
          ...where,
          status: 'ACTIVE',
        },
      }),
      this.prisma.company.count({
        where: {
          ...where,
          status: 'INACTIVE',
        },
      }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }

  private async getRoomsSummary(companyFilter: CompanyFilter) {
    const baseWhere = {
      ...companyFilter,
      deletedAt: null,
    };

    const [total, normal, warning, critical, offline] = await Promise.all([
      this.prisma.room.count({
        where: baseWhere,
      }),
      this.prisma.room.count({
        where: {
          ...baseWhere,
          thermalStatus: ThermalStatus.NORMAL,
        },
      }),
      this.prisma.room.count({
        where: {
          ...baseWhere,
          thermalStatus: ThermalStatus.WARNING,
        },
      }),
      this.prisma.room.count({
        where: {
          ...baseWhere,
          thermalStatus: ThermalStatus.CRITICAL,
        },
      }),
      this.prisma.room.count({
        where: {
          ...baseWhere,
          thermalStatus: ThermalStatus.OFFLINE,
        },
      }),
    ]);

    return {
      total,
      normal,
      warning,
      critical,
      offline,
    };
  }

  private async getSensorsSummary(companyFilter: CompanyFilter) {
    const baseWhere = {
      ...companyFilter,
      deletedAt: null,
    };

    const [total, active, offline, maintenance, inactive] = await Promise.all([
      this.prisma.sensor.count({
        where: baseWhere,
      }),
      this.prisma.sensor.count({
        where: {
          ...baseWhere,
          status: SensorStatus.ACTIVE,
        },
      }),
      this.prisma.sensor.count({
        where: {
          ...baseWhere,
          status: SensorStatus.OFFLINE,
        },
      }),
      this.prisma.sensor.count({
        where: {
          ...baseWhere,
          status: SensorStatus.MAINTENANCE,
        },
      }),
      this.prisma.sensor.count({
        where: {
          ...baseWhere,
          status: SensorStatus.INACTIVE,
        },
      }),
    ]);

    return {
      total,
      active,
      offline,
      maintenance,
      inactive,
    };
  }

  private async getEquipmentsSummary(companyFilter: CompanyFilter) {
    const baseWhere = {
      ...companyFilter,
      deletedAt: null,
    };

    const [total, active, running, stopped, maintenance, offline, inactive] =
      await Promise.all([
        this.prisma.equipment.count({
          where: baseWhere,
        }),
        this.prisma.equipment.count({
          where: {
            ...baseWhere,
            status: EquipmentStatus.ACTIVE,
          },
        }),
        this.prisma.equipment.count({
          where: {
            ...baseWhere,
            status: EquipmentStatus.RUNNING,
          },
        }),
        this.prisma.equipment.count({
          where: {
            ...baseWhere,
            status: EquipmentStatus.STOPPED,
          },
        }),
        this.prisma.equipment.count({
          where: {
            ...baseWhere,
            status: EquipmentStatus.MAINTENANCE,
          },
        }),
        this.prisma.equipment.count({
          where: {
            ...baseWhere,
            status: EquipmentStatus.OFFLINE,
          },
        }),
        this.prisma.equipment.count({
          where: {
            ...baseWhere,
            status: EquipmentStatus.INACTIVE,
          },
        }),
      ]);

    return {
      total,
      active,
      running,
      stopped,
      maintenance,
      offline,
      inactive,
    };
  }

  private async getTasksSummary(companyFilter: CompanyFilter) {
    const baseWhere = {
      ...companyFilter,
      deletedAt: null,
    };

    const [total, open, inProgress, done, canceled, overdue, criticalPriority] =
      await Promise.all([
        this.prisma.task.count({
          where: baseWhere,
        }),
        this.prisma.task.count({
          where: {
            ...baseWhere,
            status: TaskStatus.OPEN,
          },
        }),
        this.prisma.task.count({
          where: {
            ...baseWhere,
            status: TaskStatus.IN_PROGRESS,
          },
        }),
        this.prisma.task.count({
          where: {
            ...baseWhere,
            status: TaskStatus.DONE,
          },
        }),
        this.prisma.task.count({
          where: {
            ...baseWhere,
            status: TaskStatus.CANCELED,
          },
        }),
        this.prisma.task.count({
          where: {
            ...baseWhere,
            status: TaskStatus.OVERDUE,
          },
        }),
        this.prisma.task.count({
          where: {
            ...baseWhere,
            priority: TaskPriority.CRITICAL,
            status: {
              in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS, TaskStatus.OVERDUE],
            },
          },
        }),
      ]);

    return {
      total,
      open,
      inProgress,
      done,
      canceled,
      overdue,
      criticalPriority,
    };
  }

  private async getThermalAlertsSummary(companyFilter: CompanyFilter) {
    const baseWhere = {
      ...companyFilter,
      deletedAt: null,
    };

    const [
      total,
      open,
      acknowledged,
      resolved,
      dismissed,
      critical,
      warning,
      active,
    ] = await Promise.all([
      this.prisma.thermalAlert.count({
        where: baseWhere,
      }),
      this.prisma.thermalAlert.count({
        where: {
          ...baseWhere,
          status: ThermalAlertStatus.OPEN,
        },
      }),
      this.prisma.thermalAlert.count({
        where: {
          ...baseWhere,
          status: ThermalAlertStatus.ACKNOWLEDGED,
        },
      }),
      this.prisma.thermalAlert.count({
        where: {
          ...baseWhere,
          status: ThermalAlertStatus.RESOLVED,
        },
      }),
      this.prisma.thermalAlert.count({
        where: {
          ...baseWhere,
          status: ThermalAlertStatus.DISMISSED,
        },
      }),
      this.prisma.thermalAlert.count({
        where: {
          ...baseWhere,
          severity: ThermalAlertSeverity.CRITICAL,
        },
      }),
      this.prisma.thermalAlert.count({
        where: {
          ...baseWhere,
          severity: ThermalAlertSeverity.WARNING,
        },
      }),
      this.prisma.thermalAlert.count({
        where: {
          ...baseWhere,
          status: {
            in: [ThermalAlertStatus.OPEN, ThermalAlertStatus.ACKNOWLEDGED],
          },
        },
      }),
    ]);

    return {
      total,
      active,
      open,
      acknowledged,
      resolved,
      dismissed,
      critical,
      warning,
    };
  }

  private async getActiveThermalAlertRooms(companyFilter: CompanyFilter) {
    const alerts = await this.prisma.thermalAlert.findMany({
      where: {
        ...companyFilter,
        deletedAt: null,
        status: {
          in: [ThermalAlertStatus.OPEN, ThermalAlertStatus.ACKNOWLEDGED],
        },
      },
      select: {
        id: true,
        roomId: true,
        severity: true,
        status: true,
        temperature: true,
        message: true,
        triggeredAt: true,
        room: {
          select: {
            id: true,
            name: true,
            currentTemperature: true,
            thermalStatus: true,
            minTemperature: true,
            maxTemperature: true,
          },
        },
      },
      orderBy: {
        triggeredAt: 'desc',
      },
    });

    const uniqueRooms = new Map<string, (typeof alerts)[number]>();

    for (const alert of alerts) {
      if (!uniqueRooms.has(alert.roomId)) {
        uniqueRooms.set(alert.roomId, alert);
      }
    }

    return {
      total: uniqueRooms.size,
      rooms: Array.from(uniqueRooms.values()).slice(0, 10),
    };
  }

  private async getRecentThermalAlerts(companyFilter: CompanyFilter) {
    return this.prisma.thermalAlert.findMany({
      where: {
        ...companyFilter,
        deletedAt: null,
      },
      select: {
        id: true,
        companyId: true,
        roomId: true,
        sensorId: true,
        readingId: true,
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
        room: {
          select: {
            id: true,
            name: true,
            thermalStatus: true,
            currentTemperature: true,
          },
        },
        sensor: {
          select: {
            id: true,
            code: true,
            status: true,
          },
        },
      },
      orderBy: {
        triggeredAt: 'desc',
      },
      take: 5,
    });
  }

  private async getRecentServiceRecords(companyFilter: CompanyFilter) {
    return this.prisma.serviceRecord.findMany({
      where: {
        ...companyFilter,
        deletedAt: null,
      },
      select: {
        id: true,
        taskId: true,
        companyId: true,
        roomId: true,
        equipmentId: true,
        technicianId: true,
        startedAt: true,
        finishedAt: true,
        downtimeMinutes: true,
        problemFound: true,
        servicePerformed: true,
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
          },
        },
        equipment: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 5,
    });
  }

  private async getLatestRoomTemperatureReadings(companyFilter: CompanyFilter) {
    return this.prisma.roomTemperatureReading.findMany({
      where: companyFilter,
      select: {
        id: true,
        companyId: true,
        roomId: true,
        sensorId: true,
        temperature: true,
        humidity: true,
        source: true,
        readAt: true,
        room: {
          select: {
            id: true,
            name: true,
            thermalStatus: true,
            minTemperature: true,
            maxTemperature: true,
          },
        },
        sensor: {
          select: {
            id: true,
            code: true,
            status: true,
          },
        },
      },
      orderBy: {
        readAt: 'desc',
      },
      take: 10,
    });
  }

  private isCompanyScopedUser(actor: AuthUser) {
    return (
      actor.role === UserRole.CLIENT_USER || actor.role === UserRole.TECHNICIAN
    );
  }

  private resolveCompanyScope(
    requestedCompanyId: string | undefined,
    actor: AuthUser,
  ) {
    if (this.isCompanyScopedUser(actor)) {
      if (!actor.companyId) {
        throw new ForbiddenException(
          'Usuário não está vinculado a uma empresa',
        );
      }

      return actor.companyId;
    }

    return requestedCompanyId;
  }

  private async ensureCompanyExists(companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
  }
}
