import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AuthUser } from '../auth/types/auth-user.type.js';
import {
  Prisma,
  TaskOrigin,
  TaskPriority,
  TaskStatus,
  UserRole,
  UserStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { FindTasksDto } from './dto/find-tasks.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';

const taskSelect = {
  id: true,
  companyId: true,
  roomId: true,
  equipmentId: true,
  assignedToUserId: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  origin: true,
  externalCode: true,
  externalUrl: true,
  dueDate: true,
  completedAt: true,
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
  equipment: {
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      currentTemperature: true,
    },
  },
  assignedToUser: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  },
} satisfies Prisma.TaskSelect;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTaskDto: CreateTaskDto, actor: AuthUser) {
    const companyId = this.resolveCreateCompanyId(createTaskDto, actor);

    await this.ensureCompanyExists(companyId);

    if (createTaskDto.roomId) {
      await this.ensureRoomExists(createTaskDto.roomId, companyId);
    }

    if (createTaskDto.equipmentId) {
      await this.ensureEquipmentExists(
        createTaskDto.equipmentId,
        companyId,
        createTaskDto.roomId,
      );
    }

    if (createTaskDto.assignedToUserId) {
      await this.ensureUserExists(createTaskDto.assignedToUserId, companyId);
    }

    const dueDate = createTaskDto.dueDate
      ? this.parseDate(createTaskDto.dueDate, 'Prazo inválido')
      : undefined;

    return this.prisma.task.create({
      data: {
        companyId,
        roomId: createTaskDto.roomId,
        equipmentId: createTaskDto.equipmentId,
        assignedToUserId: createTaskDto.assignedToUserId,
        title: createTaskDto.title.trim(),
        description: createTaskDto.description?.trim(),
        priority: createTaskDto.priority ?? TaskPriority.MEDIUM,
        status: createTaskDto.status ?? TaskStatus.OPEN,
        origin: createTaskDto.origin ?? TaskOrigin.CRYOMAP,
        externalCode: this.optionalText(createTaskDto.externalCode),
        externalUrl: this.optionalText(createTaskDto.externalUrl),
        dueDate,
        completedAt:
          createTaskDto.status === TaskStatus.DONE ? new Date() : undefined,
      },
      select: taskSelect,
    });
  }

  async findAll(filters: FindTasksDto, actor: AuthUser) {
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
    };

    const scopedCompanyId = this.resolveReadCompanyId(filters.companyId, actor);

    if (scopedCompanyId) {
      where.companyId = scopedCompanyId;
    }

    if (filters.roomId) {
      where.roomId = filters.roomId;
    }

    if (filters.equipmentId) {
      where.equipmentId = filters.equipmentId;
    }

    if (filters.assignedToUserId) {
      where.assignedToUserId = filters.assignedToUserId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.origin) {
      where.origin = filters.origin;
    }

    if (filters.externalCode?.trim()) {
      where.externalCode = {
        contains: filters.externalCode.trim(),
        mode: 'insensitive',
      };
    }

    if (filters.startDueDate || filters.endDueDate) {
      where.dueDate = {};

      if (filters.startDueDate) {
        where.dueDate.gte = this.parseDate(
          filters.startDueDate,
          'Data inicial inválida',
        );
      }

      if (filters.endDueDate) {
        where.dueDate.lte = this.parseDate(
          filters.endDueDate,
          'Data final inválida',
        );
      }
    }

    return this.prisma.task.findMany({
      where,
      select: taskSelect,
      orderBy: [
        {
          dueDate: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
      take: 200,
    });
  }

  async findOne(id: string, actor?: AuthUser) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: taskSelect,
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    if (actor) {
      this.ensureCanAccessCompany(task.companyId, actor);
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, actor: AuthUser) {
    const currentTask = await this.findOne(id, actor);

    const data: Prisma.TaskUpdateInput = {};

    const nextCompanyId = this.resolveUpdateCompanyId(
      updateTaskDto.companyId,
      currentTask.companyId,
      actor,
    );

    const nextRoomId =
      updateTaskDto.roomId === undefined
        ? currentTask.roomId
        : updateTaskDto.roomId;

    if (updateTaskDto.companyId !== undefined) {
      await this.ensureCompanyExists(nextCompanyId);

      data.company = {
        connect: {
          id: nextCompanyId,
        },
      };

      if (
        currentTask.roomId &&
        updateTaskDto.roomId === undefined &&
        nextCompanyId !== currentTask.companyId
      ) {
        data.room = {
          disconnect: true,
        };
      }

      if (
        currentTask.equipmentId &&
        updateTaskDto.equipmentId === undefined &&
        nextCompanyId !== currentTask.companyId
      ) {
        data.equipment = {
          disconnect: true,
        };
      }
    }

    if (updateTaskDto.roomId !== undefined) {
      if (updateTaskDto.roomId === null) {
        data.room = {
          disconnect: true,
        };
      } else {
        await this.ensureRoomExists(updateTaskDto.roomId, nextCompanyId);

        data.room = {
          connect: {
            id: updateTaskDto.roomId,
          },
        };
      }
    }

    if (updateTaskDto.equipmentId !== undefined) {
      if (updateTaskDto.equipmentId === null) {
        data.equipment = {
          disconnect: true,
        };
      } else {
        await this.ensureEquipmentExists(
          updateTaskDto.equipmentId,
          nextCompanyId,
          nextRoomId ?? undefined,
        );

        data.equipment = {
          connect: {
            id: updateTaskDto.equipmentId,
          },
        };
      }
    }

    if (updateTaskDto.assignedToUserId !== undefined) {
      if (updateTaskDto.assignedToUserId === null) {
        data.assignedToUser = {
          disconnect: true,
        };
      } else {
        await this.ensureUserExists(
          updateTaskDto.assignedToUserId,
          nextCompanyId,
        );

        data.assignedToUser = {
          connect: {
            id: updateTaskDto.assignedToUserId,
          },
        };
      }
    }

    if (updateTaskDto.title !== undefined) {
      data.title = updateTaskDto.title.trim();
    }

    if (updateTaskDto.description !== undefined) {
      data.description = updateTaskDto.description?.trim() || null;
    }

    if (updateTaskDto.priority !== undefined) {
      data.priority = updateTaskDto.priority;
    }

    if (updateTaskDto.status !== undefined) {
      data.status = updateTaskDto.status;

      if (updateTaskDto.status === TaskStatus.DONE) {
        data.completedAt = currentTask.completedAt ?? new Date();
      }

      if (updateTaskDto.status !== TaskStatus.DONE) {
        data.completedAt = null;
      }
    }

    if (updateTaskDto.origin !== undefined) {
      data.origin = updateTaskDto.origin;
    }

    if (updateTaskDto.externalCode !== undefined) {
      data.externalCode = this.optionalText(updateTaskDto.externalCode);
    }

    if (updateTaskDto.externalUrl !== undefined) {
      data.externalUrl = this.optionalText(updateTaskDto.externalUrl);
    }

    if (updateTaskDto.dueDate !== undefined) {
      data.dueDate = updateTaskDto.dueDate
        ? this.parseDate(updateTaskDto.dueDate, 'Prazo inválido')
        : null;
    }

    return this.prisma.task.update({
      where: {
        id,
      },
      data,
      select: taskSelect,
    });
  }

  async remove(id: string, actor: AuthUser) {
    await this.findOne(id, actor);

    return this.prisma.task.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
      select: taskSelect,
    });
  }

  private resolveCreateCompanyId(
    createTaskDto: CreateTaskDto,
    actor: AuthUser,
  ) {
    if (actor.role === UserRole.CLIENT_USER) {
      throw new ForbiddenException('Usuário cliente não pode acessar tarefas');
    }

    if (actor.role === UserRole.TECHNICIAN) {
      if (!actor.companyId) {
        throw new ForbiddenException(
          'Técnico não está vinculado a uma empresa',
        );
      }

      if (createTaskDto.companyId !== actor.companyId) {
        throw new ForbiddenException(
          'Técnico só pode criar tarefas da própria empresa',
        );
      }

      return actor.companyId;
    }

    return createTaskDto.companyId;
  }

  private resolveReadCompanyId(
    requestedCompanyId: string | undefined,
    actor: AuthUser,
  ) {
    if (actor.role === UserRole.CLIENT_USER) {
      throw new ForbiddenException('Usuário cliente não pode acessar tarefas');
    }

    if (actor.role === UserRole.TECHNICIAN) {
      return actor.companyId ?? undefined;
    }

    return requestedCompanyId;
  }

  private resolveUpdateCompanyId(
    requestedCompanyId: string | undefined,
    currentCompanyId: string,
    actor: AuthUser,
  ) {
    if (actor.role === UserRole.CLIENT_USER) {
      throw new ForbiddenException('Usuário cliente não pode acessar tarefas');
    }

    if (actor.role === UserRole.TECHNICIAN) {
      if (!actor.companyId) {
        throw new ForbiddenException(
          'Técnico não está vinculado a uma empresa',
        );
      }

      if (
        requestedCompanyId !== undefined &&
        requestedCompanyId !== actor.companyId
      ) {
        throw new ForbiddenException(
          'Técnico não pode mover tarefa para outra empresa',
        );
      }

      if (currentCompanyId !== actor.companyId) {
        throw new ForbiddenException(
          'Técnico não pode alterar tarefa de outra empresa',
        );
      }

      return actor.companyId;
    }

    return requestedCompanyId ?? currentCompanyId;
  }

  private ensureCanAccessCompany(companyId: string, actor: AuthUser) {
    if (actor.role === UserRole.CLIENT_USER) {
      throw new ForbiddenException('Usuário cliente não pode acessar tarefas');
    }

    if (actor.role !== UserRole.TECHNICIAN) {
      return;
    }

    if (!actor.companyId || actor.companyId !== companyId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta empresa',
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

  private optionalText(value?: string | null) {
    const normalized = value?.trim();

    return normalized || null;
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

  private async ensureRoomExists(roomId: string, companyId: string) {
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

  private async ensureEquipmentExists(
    equipmentId: string,
    companyId: string,
    roomId?: string,
  ) {
    const equipment = await this.prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        companyId,
        roomId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!equipment) {
      throw new NotFoundException(
        'Equipamento não encontrado ou não vinculado ao local informado',
      );
    }
  }

  private async ensureUserExists(userId: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        status: UserStatus.ACTIVE,
        OR: [
          {
            companyId,
          },
          {
            companyId: null,
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'Usuário responsável não encontrado ou não pertence à empresa informada',
      );
    }
  }
}
