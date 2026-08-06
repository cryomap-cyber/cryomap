import { Injectable, NotFoundException } from '@nestjs/common';
import {
  EquipmentStatus,
  SensorStatus,
  TaskPriority,
  TaskStatus,
  ThermalStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DashboardQueryDto } from './dto/dashboard-query.dto.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(query: DashboardQueryDto) {
    if (query.companyId) {
      await this.ensureCompanyExists(query.companyId);
    }

    const companyFilter = query.companyId
      ? {
          companyId: query.companyId,
        }
      : {};

    const companyWhere = query.companyId
      ? {
          id: query.companyId,
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
      recentServiceRecords,
      latestRoomTemperatureReadings,
    ] = await Promise.all([
      this.getCompaniesSummary(companyWhere),
      this.getRoomsSummary(companyFilter),
      this.getSensorsSummary(companyFilter),
      this.getEquipmentsSummary(companyFilter),
      this.getTasksSummary(companyFilter),
      this.getRecentServiceRecords(companyFilter),
      this.getLatestRoomTemperatureReadings(companyFilter),
    ]);

    return {
      generatedAt: new Date(),
      filters: {
        companyId: query.companyId ?? null,
      },
      companies,
      rooms,
      sensors,
      equipments,
      tasks,
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

  private async getRoomsSummary(companyFilter: { companyId?: string }) {
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

  private async getSensorsSummary(companyFilter: { companyId?: string }) {
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

  private async getEquipmentsSummary(companyFilter: { companyId?: string }) {
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

  private async getTasksSummary(companyFilter: { companyId?: string }) {
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

  private async getRecentServiceRecords(companyFilter: { companyId?: string }) {
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

  private async getLatestRoomTemperatureReadings(companyFilter: {
    companyId?: string;
  }) {
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
