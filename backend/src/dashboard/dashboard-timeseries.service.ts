import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RecentRoomReadingsQueryDto } from './dto/recent-room-readings-query.dto.js';
import { RoomSeriesQueryDto } from './dto/room-series-query.dto.js';

@Injectable()
export class DashboardTimeseriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoomTemperatureSeries(query: RoomSeriesQueryDto) {
    const room = await this.ensureRoomExists(query.companyId, query.roomId);
    const period = this.resolvePeriod(query.startDate, query.endDate);
    const limit = this.resolveLimit(query.limit, 500);

    const readings = await this.prisma.roomTemperatureReading.findMany({
      where: {
        companyId: query.companyId,
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
        companyId: query.companyId,
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

  async getRoomHumiditySeries(query: RoomSeriesQueryDto) {
    const room = await this.ensureRoomExists(query.companyId, query.roomId);
    const period = this.resolvePeriod(query.startDate, query.endDate);
    const limit = this.resolveLimit(query.limit, 500);

    const readings = await this.prisma.roomTemperatureReading.findMany({
      where: {
        companyId: query.companyId,
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
        companyId: query.companyId,
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

  async getRoomReadingsSummary(query: RoomSeriesQueryDto) {
    const room = await this.ensureRoomExists(query.companyId, query.roomId);
    const period = this.resolvePeriod(query.startDate, query.endDate);

    const where: Prisma.RoomTemperatureReadingWhereInput = {
      companyId: query.companyId,
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
        companyId: query.companyId,
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

  async getRecentRoomReadings(query: RecentRoomReadingsQueryDto) {
    const limit = this.resolveLimit(query.limit, 50);

    if (query.companyId) {
      await this.ensureCompanyExists(query.companyId);
    }

    if (query.companyId && query.roomId) {
      await this.ensureRoomExists(query.companyId, query.roomId);
    }

    const where: Prisma.RoomTemperatureReadingWhereInput = {};

    if (query.companyId) {
      where.companyId = query.companyId;
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
        companyId: query.companyId ?? null,
        roomId: query.roomId ?? null,
        limit,
      },
      total: readings.length,
      readings,
    };
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
}
