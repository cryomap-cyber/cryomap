import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AuthUser } from '../auth/types/auth-user.type.js';
import {
  EquipmentStatus,
  Prisma,
  UserRole,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEquipmentDto } from './dto/create-equipment.dto.js';
import { UpdateEquipmentDto } from './dto/update-equipment.dto.js';

const equipmentSelect = {
  id: true,
  companyId: true,
  roomId: true,
  name: true,
  code: true,
  model: true,
  manufacturer: true,
  serialNumber: true,
  setpoint: true,
  delta: true,
  currentTemperature: true,
  status: true,
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
  room: {
    select: {
      id: true,
      name: true,
      thermalStatus: true,
      currentTemperature: true,
    },
  },
} satisfies Prisma.EquipmentSelect;

@Injectable()
export class EquipmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEquipmentDto: CreateEquipmentDto) {
    const normalizedCode = this.normalizeCode(createEquipmentDto.code);

    await this.ensureCompanyExists(createEquipmentDto.companyId);
    await this.ensureCodeIsAvailable(
      createEquipmentDto.companyId,
      normalizedCode,
    );

    if (createEquipmentDto.roomId) {
      await this.ensureRoomExists(
        createEquipmentDto.roomId,
        createEquipmentDto.companyId,
      );
    }

    const data: Prisma.EquipmentCreateInput = {
      company: {
        connect: {
          id: createEquipmentDto.companyId,
        },
      },
      room: createEquipmentDto.roomId
        ? {
            connect: {
              id: createEquipmentDto.roomId,
            },
          }
        : undefined,
      name: createEquipmentDto.name.trim(),
      code: normalizedCode,
      model: createEquipmentDto.model?.trim(),
      manufacturer: createEquipmentDto.manufacturer?.trim(),
      serialNumber: createEquipmentDto.serialNumber?.trim(),
      setpoint: createEquipmentDto.setpoint,
      delta: createEquipmentDto.delta,
      status: EquipmentStatus.ACTIVE,
      notes: createEquipmentDto.notes?.trim(),
    };

    return this.prisma.equipment.create({
      data,
      select: equipmentSelect,
    });
  }

  async findAll(actor: AuthUser, companyId?: string, roomId?: string) {
    if (roomId) {
      return this.findByRoom(roomId, actor);
    }

    const scopedCompanyId = this.resolveCompanyScope(actor, companyId);

    if (scopedCompanyId) {
      return this.findByCompany(scopedCompanyId, actor);
    }

    return this.prisma.equipment.findMany({
      where: {
        deletedAt: null,
      },
      select: equipmentSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByCompany(companyId: string, actor?: AuthUser) {
    if (actor) {
      this.ensureCanAccessCompany(companyId, actor);
    }

    await this.ensureCompanyExists(companyId);

    return this.prisma.equipment.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      select: equipmentSelect,
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findByRoom(roomId: string, actor?: AuthUser) {
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

    if (actor) {
      this.ensureCanAccessCompany(room.companyId, actor);
    }

    return this.prisma.equipment.findMany({
      where: {
        roomId,
        deletedAt: null,
      },
      select: equipmentSelect,
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string, actor?: AuthUser) {
    const equipment = await this.prisma.equipment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: equipmentSelect,
    });

    if (!equipment) {
      throw new NotFoundException('Equipamento não encontrado');
    }

    if (actor) {
      this.ensureCanAccessCompany(equipment.companyId, actor);
    }

    return equipment;
  }

  async update(id: string, updateEquipmentDto: UpdateEquipmentDto) {
    const currentEquipment = await this.findOne(id);

    const data: Prisma.EquipmentUpdateInput = {};

    const nextCompanyId =
      updateEquipmentDto.companyId ?? currentEquipment.companyId;

    if (updateEquipmentDto.companyId !== undefined) {
      await this.ensureCompanyExists(updateEquipmentDto.companyId);

      data.company = {
        connect: {
          id: updateEquipmentDto.companyId,
        },
      };

      if (
        currentEquipment.roomId &&
        updateEquipmentDto.roomId === undefined &&
        updateEquipmentDto.companyId !== currentEquipment.companyId
      ) {
        data.room = {
          disconnect: true,
        };
      }
    }

    if (updateEquipmentDto.roomId !== undefined) {
      if (updateEquipmentDto.roomId === null) {
        data.room = {
          disconnect: true,
        };
      } else {
        await this.ensureRoomExists(updateEquipmentDto.roomId, nextCompanyId);

        data.room = {
          connect: {
            id: updateEquipmentDto.roomId,
          },
        };
      }
    }

    if (updateEquipmentDto.name !== undefined) {
      data.name = updateEquipmentDto.name.trim();
    }

    if (updateEquipmentDto.code !== undefined) {
      const normalizedCode = this.normalizeCode(updateEquipmentDto.code);

      await this.ensureCodeIsAvailable(nextCompanyId, normalizedCode, id);

      data.code = normalizedCode;
    }

    if (updateEquipmentDto.model !== undefined) {
      data.model = updateEquipmentDto.model?.trim() || null;
    }

    if (updateEquipmentDto.manufacturer !== undefined) {
      data.manufacturer = updateEquipmentDto.manufacturer?.trim() || null;
    }

    if (updateEquipmentDto.serialNumber !== undefined) {
      data.serialNumber = updateEquipmentDto.serialNumber?.trim() || null;
    }

    if (updateEquipmentDto.setpoint !== undefined) {
      data.setpoint = updateEquipmentDto.setpoint;
    }

    if (updateEquipmentDto.delta !== undefined) {
      data.delta = updateEquipmentDto.delta;
    }

    if (updateEquipmentDto.status !== undefined) {
      data.status = updateEquipmentDto.status;
    }

    if (updateEquipmentDto.notes !== undefined) {
      data.notes = updateEquipmentDto.notes?.trim() || null;
    }

    return this.prisma.equipment.update({
      where: {
        id,
      },
      data,
      select: equipmentSelect,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.equipment.update({
      where: {
        id,
      },
      data: {
        status: EquipmentStatus.INACTIVE,
        deletedAt: new Date(),
      },
      select: equipmentSelect,
    });
  }

  private isCompanyScopedUser(actor: AuthUser) {
    return (
      actor.role === UserRole.CLIENT_USER || actor.role === UserRole.TECHNICIAN
    );
  }

  private resolveCompanyScope(actor: AuthUser, requestedCompanyId?: string) {
    if (this.isCompanyScopedUser(actor)) {
      return actor.companyId ?? undefined;
    }

    return requestedCompanyId;
  }

  private ensureCanAccessCompany(companyId: string, actor: AuthUser) {
    if (!this.isCompanyScopedUser(actor)) {
      return;
    }

    if (!actor.companyId || actor.companyId !== companyId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta empresa',
      );
    }
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

  private async ensureCodeIsAvailable(
    companyId: string,
    code: string,
    currentEquipmentId?: string,
  ) {
    const existingEquipment = await this.prisma.equipment.findFirst({
      where: {
        companyId,
        code,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existingEquipment) {
      return;
    }

    if (currentEquipmentId && existingEquipment.id === currentEquipmentId) {
      return;
    }

    throw new ConflictException(
      'Já existe um equipamento com este código nesta empresa',
    );
  }
}
