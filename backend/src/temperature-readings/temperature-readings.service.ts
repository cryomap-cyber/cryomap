import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ReadingSource,
  ThermalAlertSeverity,
  ThermalAlertStatus,
  ThermalStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRoomTemperatureReadingDto } from './dto/create-room-temperature-reading.dto.js';
import { FindRoomTemperatureReadingsDto } from './dto/find-room-temperature-readings.dto.js';

const roomTemperatureReadingSelect = {
  id: true,
  companyId: true,
  roomId: true,
  sensorId: true,
  temperature: true,
  humidity: true,
  source: true,
  readAt: true,
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
      minTemperature: true,
      maxTemperature: true,
      currentTemperature: true,
      thermalStatus: true,
    },
  },
  sensor: {
    select: {
      id: true,
      code: true,
      type: true,
      status: true,
      lastTemperature: true,
      lastHumidity: true,
      lastSeenAt: true,
    },
  },
} satisfies Prisma.RoomTemperatureReadingSelect;

@Injectable()
export class TemperatureReadingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateRoomTemperatureReadingDto) {
    const room = await this.ensureRoomExists(
      createDto.roomId,
      createDto.companyId,
    );

    if (createDto.sensorId) {
      await this.ensureSensorExists(
        createDto.sensorId,
        createDto.roomId,
        createDto.companyId,
      );
    }

    const readAt = createDto.readAt ? new Date(createDto.readAt) : new Date();

    if (Number.isNaN(readAt.getTime())) {
      throw new BadRequestException('Data da leitura inválida');
    }

    const thermalStatus = this.calculateThermalStatus(
      createDto.temperature,
      room.minTemperature,
      room.maxTemperature,
    );

    return this.prisma.$transaction(async (tx) => {
      const reading = await tx.roomTemperatureReading.create({
        data: {
          companyId: createDto.companyId,
          roomId: createDto.roomId,
          sensorId: createDto.sensorId,
          temperature: createDto.temperature,
          humidity: createDto.humidity,
          source: createDto.source ?? ReadingSource.MANUAL,
          readAt,
        },
        select: roomTemperatureReadingSelect,
      });

      await tx.room.update({
        where: {
          id: createDto.roomId,
        },
        data: {
          currentTemperature: createDto.temperature,
          thermalStatus,
        },
      });

      if (createDto.sensorId) {
        await tx.sensor.update({
          where: {
            id: createDto.sensorId,
          },
          data: {
            lastTemperature: createDto.temperature,
            lastHumidity: createDto.humidity,
            lastSeenAt: readAt,
          },
        });
      }

      if (thermalStatus === ThermalStatus.CRITICAL) {
        const existingOpenAlert = await tx.thermalAlert.findFirst({
          where: {
            roomId: createDto.roomId,
            deletedAt: null,
            status: {
              in: [ThermalAlertStatus.OPEN,
                ThermalAlertStatus.ACKNOWLEDGED,
              ],
            },
          },
          select: {
            id: true,
          },
        });

        const alertData = {
          sensorId: createDto.sensorId,
          readingId: reading.id,
          severity: ThermalAlertSeverity.CRITICAL,
          status: ThermalAlertStatus.OPEN,
          temperature: createDto.temperature,
          minTemperature: room.minTemperature,
          maxTemperature: room.maxTemperature,
          message: this.buildThermalAlertMessage(
            createDto.temperature,
            room.minTemperature,
            room.maxTemperature,
          ),
          triggeredAt: readAt,
          acknowledgedAt: null,
          acknowledgedByUserId: null,
          resolvedAt: null,
        };

        if (existingOpenAlert) {
          await tx.thermalAlert.update({
            where: {
              id: existingOpenAlert.id,
            },
            data: alertData,
          });
        } else {
          await tx.thermalAlert.create({
            data: {
              companyId: createDto.companyId,
              roomId: createDto.roomId,
              ...alertData,
            },
          });
        }
      } else {
        await tx.thermalAlert.updateMany({
          where: {
            roomId: createDto.roomId,
            deletedAt: null,
            status: {
              in: [ThermalAlertStatus.OPEN,
                ThermalAlertStatus.ACKNOWLEDGED,
              ],
            },
          },
          data: {
            status: ThermalAlertStatus.RESOLVED,
            resolvedAt: readAt,
          },
        });
      }

      return reading;
    });
  }

  async findAll(filters: FindRoomTemperatureReadingsDto) {
    const where: Prisma.RoomTemperatureReadingWhereInput = {};

    if (filters.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters.roomId) {
      where.roomId = filters.roomId;
    }

    if (filters.sensorId) {
      where.sensorId = filters.sensorId;
    }

    if (filters.startDate || filters.endDate) {
      where.readAt = {};

      if (filters.startDate) {
        const startDate = new Date(filters.startDate);

        if (Number.isNaN(startDate.getTime())) {
          throw new BadRequestException('Data inicial inválida');
        }

        where.readAt.gte = startDate;
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);

        if (Number.isNaN(endDate.getTime())) {
          throw new BadRequestException('Data final inválida');
        }

        where.readAt.lte = endDate;
      }
    }

    return this.prisma.roomTemperatureReading.findMany({
      where,
      select: roomTemperatureReadingSelect,
      orderBy: {
        readAt: 'desc',
      },
      take: 200,
    });
  }

  async findOne(id: string) {
    const reading = await this.prisma.roomTemperatureReading.findUnique({
      where: {
        id,
      },
      select: roomTemperatureReadingSelect,
    });

    if (!reading) {
      throw new NotFoundException('Leitura não encontrada');
    }

    return reading;
  }

  private async ensureRoomExists(roomId: string, companyId: string) {
    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        companyId,
        deletedAt: null,
      },
      select: {
        id: true,
        companyId: true,
        minTemperature: true,
        maxTemperature: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Sala não encontrada');
    }

    return room;
  }

  private async ensureSensorExists(
    sensorId: string,
    roomId: string,
    companyId: string,
  ) {
    const sensor = await this.prisma.sensor.findFirst({
      where: {
        id: sensorId,
        roomId,
        companyId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!sensor) {
      throw new NotFoundException(
        'Sensor não encontrado ou não vinculado à sala informada',
      );
    }
  }

  private calculateThermalStatus(
    currentTemperature: number,
    minTemperature?: number | null,
    maxTemperature?: number | null,
  ): ThermalStatus {
    if (
      (minTemperature !== undefined &&
        minTemperature !== null &&
        currentTemperature < minTemperature) ||
      (maxTemperature !== undefined &&
        maxTemperature !== null &&
        currentTemperature > maxTemperature)
    ) {
      return ThermalStatus.CRITICAL;
    }

    return ThermalStatus.NORMAL;
  }

  private buildThermalAlertMessage(
    currentTemperature: number,
    minTemperature?: number | null,
    maxTemperature?: number | null,
  ) {
    if (
      maxTemperature !== undefined &&
      maxTemperature !== null &&
      currentTemperature > maxTemperature
    ) {
      return `Temperatura acima do limite máximo: ${currentTemperature}°C. Limite máximo: ${maxTemperature}°C.`;
    }

    if (
      minTemperature !== undefined &&
      minTemperature !== null &&
      currentTemperature < minTemperature
    ) {
      return `Temperatura abaixo do limite mínimo: ${currentTemperature}°C. Limite mínimo: ${minTemperature}°C.`;
    }

    return `Temperatura fora da faixa configurada: ${currentTemperature}°C.`;
  }
}
