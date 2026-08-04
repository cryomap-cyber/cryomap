import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SensorStatus,
  SensorType,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSensorDto } from './dto/create-sensor.dto.js';
import { UpdateSensorDto } from './dto/update-sensor.dto.js';

const sensorSelect = {
  id: true,
  companyId: true,
  roomId: true,
  code: true,
  type: true,
  location: true,
  status: true,
  lastSeenAt: true,
  lastTemperature: true,
  lastHumidity: true,
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
    },
  },
} satisfies Prisma.SensorSelect;

@Injectable()
export class SensorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSensorDto: CreateSensorDto) {
    const normalizedCode = this.normalizeCode(createSensorDto.code);

    await this.ensureCompanyExists(createSensorDto.companyId);
    await this.ensureRoomExists(
      createSensorDto.roomId,
      createSensorDto.companyId,
    );
    await this.ensureCodeIsAvailable(normalizedCode);

    return this.prisma.sensor.create({
      data: {
        companyId: createSensorDto.companyId,
        roomId: createSensorDto.roomId,
        code: normalizedCode,
        type: createSensorDto.type ?? SensorType.TEMPERATURE_HUMIDITY,
        location: createSensorDto.location?.trim(),
        status: createSensorDto.status ?? SensorStatus.ACTIVE,
        lastTemperature: createSensorDto.lastTemperature,
        lastHumidity: createSensorDto.lastHumidity,
        lastSeenAt:
          createSensorDto.lastTemperature !== undefined ||
          createSensorDto.lastHumidity !== undefined
            ? new Date()
            : undefined,
      },
      select: sensorSelect,
    });
  }

  async findAll() {
    return this.prisma.sensor.findMany({
      where: {
        deletedAt: null,
      },
      select: sensorSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByCompany(companyId: string) {
    await this.ensureCompanyExists(companyId);

    return this.prisma.sensor.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      select: sensorSelect,
      orderBy: {
        code: 'asc',
      },
    });
  }

  async findByRoom(roomId: string) {
    await this.ensureRoomExists(roomId);

    return this.prisma.sensor.findMany({
      where: {
        roomId,
        deletedAt: null,
      },
      select: sensorSelect,
      orderBy: {
        code: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const sensor = await this.prisma.sensor.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: sensorSelect,
    });

    if (!sensor) {
      throw new NotFoundException('Sensor não encontrado');
    }

    return sensor;
  }

  async update(id: string, updateSensorDto: UpdateSensorDto) {
    const currentSensor = await this.findOne(id);

    const data: Prisma.SensorUpdateInput = {};

    const nextCompanyId = updateSensorDto.companyId ?? currentSensor.companyId;
    const nextRoomId = updateSensorDto.roomId ?? currentSensor.roomId;

    if (updateSensorDto.companyId !== undefined) {
      await this.ensureCompanyExists(updateSensorDto.companyId);

      data.company = {
        connect: {
          id: updateSensorDto.companyId,
        },
      };
    }

    if (
      updateSensorDto.companyId !== undefined ||
      updateSensorDto.roomId !== undefined
    ) {
      await this.ensureRoomExists(nextRoomId, nextCompanyId);

      data.room = {
        connect: {
          id: nextRoomId,
        },
      };
    }

    if (updateSensorDto.code !== undefined) {
      const normalizedCode = this.normalizeCode(updateSensorDto.code);

      await this.ensureCodeIsAvailable(normalizedCode, id);

      data.code = normalizedCode;
    }

    if (updateSensorDto.type !== undefined) {
      data.type = updateSensorDto.type;
    }

    if (updateSensorDto.location !== undefined) {
      data.location = updateSensorDto.location?.trim() || null;
    }

    if (updateSensorDto.status !== undefined) {
      data.status = updateSensorDto.status;
    }

    if (updateSensorDto.lastTemperature !== undefined) {
      data.lastTemperature = updateSensorDto.lastTemperature;
    }

    if (updateSensorDto.lastHumidity !== undefined) {
      data.lastHumidity = updateSensorDto.lastHumidity;
    }

    if (
      updateSensorDto.lastTemperature !== undefined ||
      updateSensorDto.lastHumidity !== undefined
    ) {
      data.lastSeenAt = new Date();
    }

    return this.prisma.sensor.update({
      where: {
        id,
      },
      data,
      select: sensorSelect,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.sensor.update({
      where: {
        id,
      },
      data: {
        status: SensorStatus.INACTIVE,
        deletedAt: new Date(),
      },
      select: sensorSelect,
    });
  }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase();
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
    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        companyId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Sala não encontrada');
    }
  }

  private async ensureCodeIsAvailable(code: string, currentSensorId?: string) {
    const existingSensor = await this.prisma.sensor.findUnique({
      where: {
        code,
      },
      select: {
        id: true,
      },
    });

    if (!existingSensor) {
      return;
    }

    if (currentSensorId && existingSensor.id === currentSensorId) {
      return;
    }

    throw new ConflictException('Já existe um sensor com este código');
  }
}
