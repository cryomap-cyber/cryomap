import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ThermalStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRoomDto } from './dto/create-room.dto.js';
import { UpdateRoomDto } from './dto/update-room.dto.js';

const roomSelect = {
  id: true,
  companyId: true,
  name: true,
  type: true,
  minTemperature: true,
  maxTemperature: true,
  currentTemperature: true,
  thermalStatus: true,
  mapX: true,
  mapY: true,
  notes: true,
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
} satisfies Prisma.RoomSelect;

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRoomDto: CreateRoomDto) {
    await this.ensureCompanyExists(createRoomDto.companyId);

    const thermalStatus = this.calculateThermalStatus(
      createRoomDto.currentTemperature,
      createRoomDto.minTemperature,
      createRoomDto.maxTemperature,
    );

    return this.prisma.room.create({
      data: {
        companyId: createRoomDto.companyId,
        name: createRoomDto.name.trim(),
        type: createRoomDto.type?.trim(),
        minTemperature: createRoomDto.minTemperature,
        maxTemperature: createRoomDto.maxTemperature,
        currentTemperature: createRoomDto.currentTemperature,
        thermalStatus,
        mapX: createRoomDto.mapX,
        mapY: createRoomDto.mapY,
        notes: createRoomDto.notes?.trim(),
      },
      select: roomSelect,
    });
  }

  async findAll() {
    return this.prisma.room.findMany({
      where: {
        deletedAt: null,
      },
      select: roomSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByCompany(companyId: string) {
    await this.ensureCompanyExists(companyId);

    return this.prisma.room.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      select: roomSelect,
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: roomSelect,
    });

    if (!room) {
      throw new NotFoundException('Sala não encontrada');
    }

    return room;
  }

  async update(id: string, updateRoomDto: UpdateRoomDto) {
    const currentRoom = await this.findOne(id);

    const data: Prisma.RoomUpdateInput = {};

    if (updateRoomDto.companyId !== undefined) {
      await this.ensureCompanyExists(updateRoomDto.companyId);

      data.company = {
        connect: {
          id: updateRoomDto.companyId,
        },
      };
    }

    if (updateRoomDto.name !== undefined) {
      data.name = updateRoomDto.name.trim();
    }

    if (updateRoomDto.type !== undefined) {
      data.type = updateRoomDto.type?.trim() || null;
    }

    if (updateRoomDto.minTemperature !== undefined) {
      data.minTemperature = updateRoomDto.minTemperature;
    }

    if (updateRoomDto.maxTemperature !== undefined) {
      data.maxTemperature = updateRoomDto.maxTemperature;
    }

    if (updateRoomDto.currentTemperature !== undefined) {
      data.currentTemperature = updateRoomDto.currentTemperature;
    }

    if (updateRoomDto.mapX !== undefined) {
      data.mapX = updateRoomDto.mapX;
    }

    if (updateRoomDto.mapY !== undefined) {
      data.mapY = updateRoomDto.mapY;
    }

    if (updateRoomDto.notes !== undefined) {
      data.notes = updateRoomDto.notes?.trim() || null;
    }

    if (updateRoomDto.thermalStatus !== undefined) {
      data.thermalStatus = updateRoomDto.thermalStatus;
    } else if (
      updateRoomDto.currentTemperature !== undefined ||
      updateRoomDto.minTemperature !== undefined ||
      updateRoomDto.maxTemperature !== undefined
    ) {
      const nextCurrentTemperature =
        updateRoomDto.currentTemperature ??
        currentRoom.currentTemperature ??
        undefined;

      const nextMinTemperature =
        updateRoomDto.minTemperature ?? currentRoom.minTemperature ?? undefined;

      const nextMaxTemperature =
        updateRoomDto.maxTemperature ?? currentRoom.maxTemperature ?? undefined;

      data.thermalStatus = this.calculateThermalStatus(
        nextCurrentTemperature,
        nextMinTemperature,
        nextMaxTemperature,
      );
    }

    return this.prisma.room.update({
      where: {
        id,
      },
      data,
      select: roomSelect,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.room.update({
      where: {
        id,
      },
      data: {
        thermalStatus: ThermalStatus.OFFLINE,
        deletedAt: new Date(),
      },
      select: roomSelect,
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

  private calculateThermalStatus(
    currentTemperature?: number | null,
    minTemperature?: number | null,
    maxTemperature?: number | null,
  ): ThermalStatus {
    if (currentTemperature === undefined || currentTemperature === null) {
      return ThermalStatus.OFFLINE;
    }

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
}
