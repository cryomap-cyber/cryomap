import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EquipmentStatus,
  Prisma,
  SensorStatus,
  TaskPriority,
  TaskStatus,
  ThermalAlertSeverity,
  ThermalAlertStatus,
  ThermalStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReportsQueryDto } from './dto/reports-query.dto.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOperationalSummary(query: ReportsQueryDto) {
    await this.validateFilters(query);

    const period = this.resolvePeriod(query.startDate, query.endDate);
    const baseFilter = this.buildBaseFilter(query);

    const [
      companies,
      rooms,
      sensors,
      equipments,
      tasks,
      serviceRecords,
      downtime,
      thermalReadings,
      thermalAlerts,
    ] = await Promise.all([
      this.getCompaniesSummary(query),
      this.getRoomsSummary(baseFilter),
      this.getSensorsSummary(baseFilter),
      this.getEquipmentsSummary(baseFilter),
      this.getTasksSummary(query),
      this.getServiceRecordsSummary(query),
      this.getDowntimeSummary(query),
      this.getThermalReadingsSummary(query),
      this.getThermalAlertsSummary(query, period),
    ]);

    return {
      generatedAt: new Date(),
      period,
      filters: this.normalizeFilters(query),
      companies,
      rooms,
      sensors,
      equipments,
      tasks,
      serviceRecords,
      downtime,
      thermalReadings,
      thermalAlerts,
    };
  }

  async getTasksSummary(query: ReportsQueryDto) {
    await this.validateFilters(query);

    const period = this.resolvePeriod(query.startDate, query.endDate);
    const where = this.buildTaskWhere(query, period);

    const [
      total,
      open,
      inProgress,
      done,
      canceled,
      overdue,
      low,
      medium,
      high,
      critical,
      recentTasks,
    ] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.count({
        where: {
          ...where,
          status: TaskStatus.OPEN,
        },
      }),
      this.prisma.task.count({
        where: {
          ...where,
          status: TaskStatus.IN_PROGRESS,
        },
      }),
      this.prisma.task.count({
        where: {
          ...where,
          status: TaskStatus.DONE,
        },
      }),
      this.prisma.task.count({
        where: {
          ...where,
          status: TaskStatus.CANCELED,
        },
      }),
      this.prisma.task.count({
        where: {
          ...where,
          status: TaskStatus.OVERDUE,
        },
      }),
      this.prisma.task.count({
        where: {
          ...where,
          priority: TaskPriority.LOW,
        },
      }),
      this.prisma.task.count({
        where: {
          ...where,
          priority: TaskPriority.MEDIUM,
        },
      }),
      this.prisma.task.count({
        where: {
          ...where,
          priority: TaskPriority.HIGH,
        },
      }),
      this.prisma.task.count({
        where: {
          ...where,
          priority: TaskPriority.CRITICAL,
        },
      }),
      this.prisma.task.findMany({
        where,
        select: {
          id: true,
          companyId: true,
          roomId: true,
          equipmentId: true,
          assignedToUserId: true,
          title: true,
          priority: true,
          status: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
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
          assignedToUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
    ]);

    return {
      generatedAt: new Date(),
      period,
      filters: this.normalizeFilters(query),
      total,
      byStatus: {
        open,
        inProgress,
        done,
        canceled,
        overdue,
      },
      byPriority: {
        low,
        medium,
        high,
        critical,
      },
      recentTasks,
    };
  }

  async getServiceRecordsSummary(query: ReportsQueryDto) {
    await this.validateFilters(query);

    const period = this.resolvePeriod(query.startDate, query.endDate);
    const where = this.buildServiceRecordWhere(query, period);

    const [total, finished, inProgress, recentServiceRecords] =
      await Promise.all([
        this.prisma.serviceRecord.count({ where }),
        this.prisma.serviceRecord.count({
          where: {
            ...where,
            finishedAt: {
              not: null,
            },
          },
        }),
        this.prisma.serviceRecord.count({
          where: {
            ...where,
            finishedAt: null,
          },
        }),
        this.prisma.serviceRecord.findMany({
          where,
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
          take: 10,
        }),
      ]);

    return {
      generatedAt: new Date(),
      period,
      filters: this.normalizeFilters(query),
      total,
      finished,
      inProgress,
      recentServiceRecords,
    };
  }

  async getDowntimeSummary(query: ReportsQueryDto) {
    await this.validateFilters(query);

    const period = this.resolvePeriod(query.startDate, query.endDate);
    const where = this.buildServiceRecordWhere(query, period);

    const [stats, topEquipments, topRooms, recentDowntimeRecords] =
      await Promise.all([
        this.prisma.serviceRecord.aggregate({
          where,
          _count: true,
          _sum: {
            downtimeMinutes: true,
          },
          _avg: {
            downtimeMinutes: true,
          },
          _max: {
            downtimeMinutes: true,
          },
        }),
        this.prisma.serviceRecord.groupBy({
          by: ['equipmentId'],
          where: {
            ...where,
            equipmentId: {
              not: null,
            },
            downtimeMinutes: {
              not: null,
            },
          },
          _sum: {
            downtimeMinutes: true,
          },
          _count: true,
          orderBy: {
            _sum: {
              downtimeMinutes: 'desc',
            },
          },
          take: 5,
        }),
        this.prisma.serviceRecord.groupBy({
          by: ['roomId'],
          where: {
            ...where,
            roomId: {
              not: null,
            },
            downtimeMinutes: {
              not: null,
            },
          },
          _sum: {
            downtimeMinutes: true,
          },
          _count: true,
          orderBy: {
            _sum: {
              downtimeMinutes: 'desc',
            },
          },
          take: 5,
        }),
        this.prisma.serviceRecord.findMany({
          where: {
            ...where,
            downtimeMinutes: {
              not: null,
            },
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
              },
            },
          },
          orderBy: {
            downtimeMinutes: 'desc',
          },
          take: 10,
        }),
      ]);

    const equipmentIds = topEquipments
      .map((item) => item.equipmentId)
      .filter((id): id is string => id !== null);

    const roomIds = topRooms
      .map((item) => item.roomId)
      .filter((id): id is string => id !== null);

    const [equipments, rooms] = await Promise.all([
      this.prisma.equipment.findMany({
        where: {
          id: {
            in: equipmentIds,
          },
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      }),
      this.prisma.room.findMany({
        where: {
          id: {
            in: roomIds,
          },
        },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    const equipmentById = new Map(
      equipments.map((equipment) => [equipment.id, equipment]),
    );

    const roomById = new Map(rooms.map((room) => [room.id, room]));

    const totalMinutes = stats._sum.downtimeMinutes ?? 0;

    return {
      generatedAt: new Date(),
      period,
      filters: this.normalizeFilters(query),
      totalRecords: stats._count,
      totalDowntimeMinutes: totalMinutes,
      totalDowntimeHours: Number((totalMinutes / 60).toFixed(2)),
      averageDowntimeMinutes: stats._avg.downtimeMinutes,
      maximumDowntimeMinutes: stats._max.downtimeMinutes,
      topEquipments: topEquipments.map((item) => ({
        equipmentId: item.equipmentId,
        equipment: item.equipmentId
          ? (equipmentById.get(item.equipmentId) ?? null)
          : null,
        records: item._count,
        downtimeMinutes: item._sum.downtimeMinutes ?? 0,
        downtimeHours: Number(
          ((item._sum.downtimeMinutes ?? 0) / 60).toFixed(2),
        ),
      })),
      topRooms: topRooms.map((item) => ({
        roomId: item.roomId,
        room: item.roomId ? (roomById.get(item.roomId) ?? null) : null,
        records: item._count,
        downtimeMinutes: item._sum.downtimeMinutes ?? 0,
        downtimeHours: Number(
          ((item._sum.downtimeMinutes ?? 0) / 60).toFixed(2),
        ),
      })),
      recentDowntimeRecords,
    };
  }

  async getThermalReadingsSummary(query: ReportsQueryDto) {
    await this.validateFilters(query);

    const period = this.resolvePeriod(query.startDate, query.endDate);
    const where = this.buildRoomTemperatureReadingWhere(query, period);

    const [stats, criticalRooms, latestReadings] = await Promise.all([
      this.prisma.roomTemperatureReading.aggregate({
        where,
        _count: true,
        _avg: {
          temperature: true,
          humidity: true,
        },
        _min: {
          temperature: true,
          humidity: true,
          readAt: true,
        },
        _max: {
          temperature: true,
          humidity: true,
          readAt: true,
        },
      }),
      this.prisma.room.findMany({
        where: {
          ...this.buildBaseFilter(query),
          ...(query.roomId
            ? {
                id: query.roomId,
              }
            : {}),
          ...(query.equipmentId
            ? {
                equipments: {
                  some: {
                    id: query.equipmentId,
                    deletedAt: null,
                  },
                },
              }
            : {}),
          deletedAt: null,
          thermalStatus: ThermalStatus.CRITICAL,
        },
        select: {
          id: true,
          name: true,
          currentTemperature: true,
          minTemperature: true,
          maxTemperature: true,
          thermalStatus: true,
        },
        orderBy: {
          name: 'asc',
        },
        take: 20,
      }),
      this.prisma.roomTemperatureReading.findMany({
        where,
        select: {
          id: true,
          companyId: true,
          roomId: true,
          sensorId: true,
          temperature: true,
          humidity: true,
          source: true,
          readAt: true,
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
              thermalStatus: true,
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
      }),
    ]);

    return {
      generatedAt: new Date(),
      period,
      filters: this.normalizeFilters(query),
      totalReadings: stats._count,
      temperature: {
        average: stats._avg.temperature,
        minimum: stats._min.temperature,
        maximum: stats._max.temperature,
      },
      humidity: {
        average: stats._avg.humidity,
        minimum: stats._min.humidity,
        maximum: stats._max.humidity,
      },
      readAt: {
        first: stats._min.readAt,
        last: stats._max.readAt,
      },
      criticalRooms,
      latestReadings,
    };
  }

  private async getCompaniesSummary(query: ReportsQueryDto) {
    const where: Prisma.CompanyWhereInput = {
      deletedAt: null,
    };

    if (query.companyId) {
      where.id = query.companyId;
    }

    const [total, active, inactive] = await Promise.all([
      this.prisma.company.count({ where }),
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

  private async getRoomsSummary(baseFilter: { companyId?: string }) {
    const where = {
      ...baseFilter,
      deletedAt: null,
    };

    const [total, normal, warning, critical, offline] = await Promise.all([
      this.prisma.room.count({ where }),
      this.prisma.room.count({
        where: {
          ...where,
          thermalStatus: ThermalStatus.NORMAL,
        },
      }),
      this.prisma.room.count({
        where: {
          ...where,
          thermalStatus: ThermalStatus.WARNING,
        },
      }),
      this.prisma.room.count({
        where: {
          ...where,
          thermalStatus: ThermalStatus.CRITICAL,
        },
      }),
      this.prisma.room.count({
        where: {
          ...where,
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

  private async getSensorsSummary(baseFilter: { companyId?: string }) {
    const where = {
      ...baseFilter,
      deletedAt: null,
    };

    const [total, active, offline, maintenance, inactive] = await Promise.all([
      this.prisma.sensor.count({ where }),
      this.prisma.sensor.count({
        where: {
          ...where,
          status: SensorStatus.ACTIVE,
        },
      }),
      this.prisma.sensor.count({
        where: {
          ...where,
          status: SensorStatus.OFFLINE,
        },
      }),
      this.prisma.sensor.count({
        where: {
          ...where,
          status: SensorStatus.MAINTENANCE,
        },
      }),
      this.prisma.sensor.count({
        where: {
          ...where,
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

  private async getEquipmentsSummary(baseFilter: { companyId?: string }) {
    const where = {
      ...baseFilter,
      deletedAt: null,
    };

    const [total, active, running, stopped, maintenance, offline, inactive] =
      await Promise.all([
        this.prisma.equipment.count({ where }),
        this.prisma.equipment.count({
          where: {
            ...where,
            status: EquipmentStatus.ACTIVE,
          },
        }),
        this.prisma.equipment.count({
          where: {
            ...where,
            status: EquipmentStatus.RUNNING,
          },
        }),
        this.prisma.equipment.count({
          where: {
            ...where,
            status: EquipmentStatus.STOPPED,
          },
        }),
        this.prisma.equipment.count({
          where: {
            ...where,
            status: EquipmentStatus.MAINTENANCE,
          },
        }),
        this.prisma.equipment.count({
          where: {
            ...where,
            status: EquipmentStatus.OFFLINE,
          },
        }),
        this.prisma.equipment.count({
          where: {
            ...where,
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

  private async getThermalAlertsSummary(
    query: ReportsQueryDto,
    period: {
      startDate: Date;
      endDate: Date;
    },
  ) {
    const where: Prisma.ThermalAlertWhereInput = {
      deletedAt: null,
      triggeredAt: {
        gte: period.startDate,
        lte: period.endDate,
      },
    };

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    if (query.roomId) {
      where.roomId = query.roomId;
    }

    const [total, open, acknowledged, resolved, dismissed, critical, warning] =
      await Promise.all([
        this.prisma.thermalAlert.count({ where }),
        this.prisma.thermalAlert.count({
          where: {
            ...where,
            status: ThermalAlertStatus.OPEN,
          },
        }),
        this.prisma.thermalAlert.count({
          where: {
            ...where,
            status: ThermalAlertStatus.ACKNOWLEDGED,
          },
        }),
        this.prisma.thermalAlert.count({
          where: {
            ...where,
            status: ThermalAlertStatus.RESOLVED,
          },
        }),
        this.prisma.thermalAlert.count({
          where: {
            ...where,
            status: ThermalAlertStatus.DISMISSED,
          },
        }),
        this.prisma.thermalAlert.count({
          where: {
            ...where,
            severity: ThermalAlertSeverity.CRITICAL,
          },
        }),
        this.prisma.thermalAlert.count({
          where: {
            ...where,
            severity: ThermalAlertSeverity.WARNING,
          },
        }),
      ]);

    return {
      total,
      byStatus: {
        open,
        acknowledged,
        resolved,
        dismissed,
      },
      bySeverity: {
        critical,
        warning,
      },
    };
  }

  private buildBaseFilter(query: ReportsQueryDto) {
    const filter: {
      companyId?: string;
    } = {};

    if (query.companyId) {
      filter.companyId = query.companyId;
    }

    return filter;
  }

  private buildTaskWhere(
    query: ReportsQueryDto,
    period: {
      startDate: Date;
      endDate: Date;
    },
  ): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      createdAt: {
        gte: period.startDate,
        lte: period.endDate,
      },
    };

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    if (query.roomId) {
      where.roomId = query.roomId;
    }

    if (query.equipmentId) {
      where.equipmentId = query.equipmentId;
    }

    if (query.technicianId) {
      where.assignedToUserId = query.technicianId;
    }

    return where;
  }

  private buildServiceRecordWhere(
    query: ReportsQueryDto,
    period: {
      startDate: Date;
      endDate: Date;
    },
  ): Prisma.ServiceRecordWhereInput {
    const where: Prisma.ServiceRecordWhereInput = {
      deletedAt: null,
      startedAt: {
        gte: period.startDate,
        lte: period.endDate,
      },
    };

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    if (query.roomId) {
      where.roomId = query.roomId;
    }

    if (query.equipmentId) {
      where.equipmentId = query.equipmentId;
    }

    if (query.technicianId) {
      where.technicianId = query.technicianId;
    }

    return where;
  }

  private buildRoomTemperatureReadingWhere(
    query: ReportsQueryDto,
    period: {
      startDate: Date;
      endDate: Date;
    },
  ): Prisma.RoomTemperatureReadingWhereInput {
    const where: Prisma.RoomTemperatureReadingWhereInput = {
      readAt: {
        gte: period.startDate,
        lte: period.endDate,
      },
    };

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    if (query.roomId) {
      where.roomId = query.roomId;
    }

    return where;
  }

  private resolvePeriod(startDate?: string, endDate?: string) {
    const resolvedEndDate = endDate ? new Date(endDate) : new Date();

    if (Number.isNaN(resolvedEndDate.getTime())) {
      throw new BadRequestException('Data final inválida');
    }

    const resolvedStartDate = startDate
      ? new Date(startDate)
      : new Date(resolvedEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(resolvedStartDate.getTime())) {
      throw new BadRequestException('Data inicial inválida');
    }

    if (resolvedStartDate > resolvedEndDate) {
      throw new BadRequestException(
        'A data inicial não pode ser maior que a data final',
      );
    }

    return {
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
    };
  }

  private normalizeFilters(query: ReportsQueryDto) {
    return {
      companyId: query.companyId ?? null,
      roomId: query.roomId ?? null,
      equipmentId: query.equipmentId ?? null,
      technicianId: query.technicianId ?? null,
      startDate: query.startDate ?? null,
      endDate: query.endDate ?? null,
    };
  }

  private async validateFilters(query: ReportsQueryDto) {
    if (query.companyId) {
      await this.ensureCompanyExists(query.companyId);
    }

    if (query.roomId) {
      await this.ensureRoomExists(query.roomId, query.companyId);
    }

    if (query.equipmentId) {
      await this.ensureEquipmentExists(query.equipmentId, query.companyId);
    }

    if (query.technicianId) {
      await this.ensureTechnicianExists(query.technicianId, query.companyId);
    }
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

  private async ensureRoomExists(roomId: string, companyId?: string) {
    const where: Prisma.RoomWhereInput = {
      id: roomId,
      deletedAt: null,
    };

    if (companyId) {
      where.companyId = companyId;
    }

    const room = await this.prisma.room.findFirst({
      where,
      select: {
        id: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Sala não encontrada');
    }
  }

  private async ensureEquipmentExists(equipmentId: string, companyId?: string) {
    const where: Prisma.EquipmentWhereInput = {
      id: equipmentId,
      deletedAt: null,
    };

    if (companyId) {
      where.companyId = companyId;
    }

    const equipment = await this.prisma.equipment.findFirst({
      where,
      select: {
        id: true,
      },
    });

    if (!equipment) {
      throw new NotFoundException('Equipamento não encontrado');
    }
  }

  private async ensureTechnicianExists(
    technicianId: string,
    companyId?: string,
  ) {
    const where: Prisma.UserWhereInput = {
      id: technicianId,
      deletedAt: null,
    };

    if (companyId) {
      where.OR = [
        {
          companyId,
        },
        {
          companyId: null,
        },
      ];
    }

    const technician = await this.prisma.user.findFirst({
      where,
      select: {
        id: true,
      },
    });

    if (!technician) {
      throw new NotFoundException('Técnico não encontrado');
    }
  }
}
