import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AuthUser } from '../auth/types/auth-user.type.js';
import { Prisma, UserRole } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RecentRoomReadingsQueryDto } from './dto/recent-room-readings-query.dto.js';
import { RoomSeriesQueryDto } from './dto/room-series-query.dto.js';

@Injectable()
export class DashboardTimeseriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoomTemperatureSeries(query: RoomSeriesQueryDto, actor: AuthUser) {
    const companyId = this.resolveRequiredCompanyScope(query.companyId, actor);
    const room = await this.ensureRoomExists(companyId, query.roomId);
    const period = this.resolvePeriod(query.startDate, query.endDate);
    const limit = this.resolveLimit(query.limit, 500);

    const readings = await this.prisma.roomTemperatureReading.findMany({
      where: {
        companyId,
        roomId: query.roomId,
        readAt: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
      select: {
        id: true,
        temperature: true,
        humidity: true,
        source: true,
        readAt: true,
        sensor: {
          select: {
            id: true,
            code: true,
            status: true,
          },
        },
      },
      orderBy: {
        readAt: 'asc',
      },
      take: limit,
    });

    return {
      generatedAt: new Date(),
      filters: {
        companyId,
        roomId: query.roomId,
        startDate: period.startDate,
        endDate: period.endDate,
        limit,
      },
      room,
      total: readings.length,
      points: readings.map((reading) => ({
        id: reading.id,
        value: reading.temperature,
        temperature: reading.temperature,
        humidity: reading.humidity,
        source: reading.source,
        readAt: reading.readAt,
        sensor: reading.sensor,
      })),
    };
  }

  async getRoomHumiditySeries(query: RoomSeriesQueryDto, actor: AuthUser) {
    const companyId = this.resolveRequiredCompanyScope(query.companyId, actor);
    const room = await this.ensureRoomExists(companyId, query.roomId);
    const period = this.resolvePeriod(query.startDate, query.endDate);
    const limit = this.resolveLimit(query.limit, 500);

    const readings = await this.prisma.roomTemperatureReading.findMany({
      where: {
        companyId,
        roomId: query.roomId,
        readAt: {
          gte: period.startDate,
          lte: period.endDate,
        },
        humidity: {
          not: null,
        },
      },
      select: {
        id: true,
        temperature: true,
        humidity: true,
        source: true,
        readAt: true,
        sensor: {
          select: {
            id: true,
            code: true,
            status: true,
          },
        },
      },
      orderBy: {
        readAt: 'asc',
      },
      take: limit,
    });

    return {
      generatedAt: new Date(),
      filters: {
        companyId,
        roomId: query.roomId,
        startDate: period.startDate,
        endDate: period.endDate,
        limit,
      },
      room,
      total: readings.length,
      points: readings.map((reading) => ({
        id: reading.id,
        value: reading.humidity,
        humidity: reading.humidity,
        temperature: reading.temperature,
        source: reading.source,
        readAt: reading.readAt,
        sensor: reading.sensor,
      })),
    };
  }

  async getRoomReadingsSummary(query: RoomSeriesQueryDto, actor: AuthUser) {
    const companyId = this.resolveRequiredCompanyScope(query.companyId, actor);
    const room = await this.ensureRoomExists(companyId, query.roomId);
    const period = this.resolvePeriod(query.startDate, query.endDate);

    const where: Prisma.RoomTemperatureReadingWhereInput = {
      companyId,
      roomId: query.roomId,
      readAt: {
        gte: period.startDate,
        lte: period.endDate,
      },
    };

    const [stats, latestReading, firstReading] = await Promise.all([
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
      this.prisma.roomTemperatureReading.findFirst({
        where,
        select: {
          id: true,
          temperature: true,
          humidity: true,
          source: true,
          readAt: true,
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
      }),
      this.prisma.roomTemperatureReading.findFirst({
        where,
        select: {
          id: true,
          temperature: true,
          humidity: true,
          source: true,
          readAt: true,
          sensor: {
            select: {
              id: true,
              code: true,
              status: true,
            },
          },
        },
        orderBy: {
          readAt: 'asc',
        },
      }),
    ]);

    return {
      generatedAt: new Date(),
      filters: {
        companyId,
        roomId: query.roomId,
        startDate: period.startDate,
        endDate: period.endDate,
      },
      room,
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
      period: {
        firstReadAt: stats._min.readAt,
        lastReadAt: stats._max.readAt,
      },
      firstReading,
      latestReading,
    };
  }

  async getRecentRoomReadings(
    query: RecentRoomReadingsQueryDto,
    actor: AuthUser,
  ) {
    const limit = this.resolveLimit(query.limit, 50);
    const companyId = this.resolveOptionalCompanyScope(query.companyId, actor);

    if (companyId) {
      await this.ensureCompanyExists(companyId);
    }

    if (query.roomId) {
      if (companyId) {
        await this.ensureRoomExists(companyId, query.roomId);
      } else {
        await this.ensureRoomExistsById(query.roomId);
      }
    }

    const where: Prisma.RoomTemperatureReadingWhereInput = {};

    if (companyId) {
      where.companyId = companyId;
    }

    if (query.roomId) {
      where.roomId = query.roomId;
    }

    const readings = await this.prisma.roomTemperatureReading.findMany({
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
          },
        },
      },
      orderBy: {
        readAt: 'desc',
      },
      take: limit,
    });

    return {
      generatedAt: new Date(),
      filters: {
        companyId: companyId ?? null,
        roomId: query.roomId ?? null,
        limit,
      },
      total: readings.length,
      readings,
    };
  }

  private isCompanyScopedUser(actor: AuthUser) {
    return (
      actor.role === UserRole.CLIENT_USER || actor.role === UserRole.TECHNICIAN
    );
  }

  private resolveRequiredCompanyScope(
    requestedCompanyId: string,
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

  private resolveOptionalCompanyScope(
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

  private resolvePeriod(startDate?: string, endDate?: string) {
    const resolvedEndDate = endDate ? new Date(endDate) : new Date();

    if (Number.isNaN(resolvedEndDate.getTime())) {
      throw new BadRequestException('Data final inválida');
    }

    const resolvedStartDate = startDate
      ? new Date(startDate)
      : new Date(resolvedEndDate.getTime() - 24 * 60 * 60 * 1000);

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

  private resolveLimit(value: string | undefined, defaultLimit: number) {
    if (!value) {
      return defaultLimit;
    }

    const limit = Number(value);

    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      throw new BadRequestException(
        'O limite deve ser um número inteiro entre 1 e 1000',
      );
    }

    return limit;
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

  private async ensureRoomExists(companyId: string, roomId: string) {
    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        companyId,
        deletedAt: null,
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        thermalStatus: true,
        currentTemperature: true,
        minTemperature: true,
        maxTemperature: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Sala não encontrada');
    }

    return room;
  }

  private async ensureRoomExistsById(roomId: string) {
    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        deletedAt: null,
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        thermalStatus: true,
        currentTemperature: true,
        minTemperature: true,
        maxTemperature: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Sala não encontrada');
    }

    return room;
  }
}
