import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TaskPriority,
  TaskStatus,
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

  async create(createTaskDto: CreateTaskDto) {
    await this.ensureCompanyExists(createTaskDto.companyId);

    if (createTaskDto.roomId) {
      await this.ensureRoomExists(
        createTaskDto.roomId,
        createTaskDto.companyId,
      );
    }

    if (createTaskDto.equipmentId) {
      await this.ensureEquipmentExists(
        createTaskDto.equipmentId,
        createTaskDto.companyId,
        createTaskDto.roomId,
      );
    }

    if (createTaskDto.assignedToUserId) {
      await this.ensureUserExists(
        createTaskDto.assignedToUserId,
        createTaskDto.companyId,
      );
    }

    const dueDate = createTaskDto.dueDate
      ? this.parseDate(createTaskDto.dueDate, 'Prazo inválido')
      : undefined;

    return this.prisma.task.create({
      data: {
        companyId: createTaskDto.companyId,
        roomId: createTaskDto.roomId,
        equipmentId: createTaskDto.equipmentId,
        assignedToUserId: createTaskDto.assignedToUserId,
        title: createTaskDto.title.trim(),
        description: createTaskDto.description?.trim(),
        priority: createTaskDto.priority ?? TaskPriority.MEDIUM,
        status: createTaskDto.status ?? TaskStatus.OPEN,
        dueDate,
        completedAt:
          createTaskDto.status === TaskStatus.DONE ? new Date() : undefined,
      },
      select: taskSelect,
    });
  }

  async findAll(filters: FindTasksDto) {
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
    };

    if (filters.companyId) {
      where.companyId = filters.companyId;
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

  async findOne(id: string) {
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

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    const currentTask = await this.findOne(id);

    const data: Prisma.TaskUpdateInput = {};

    const nextCompanyId = updateTaskDto.companyId ?? currentTask.companyId;
    const nextRoomId =
      updateTaskDto.roomId === undefined
        ? currentTask.roomId
        : updateTaskDto.roomId;

    if (updateTaskDto.companyId !== undefined) {
      await this.ensureCompanyExists(updateTaskDto.companyId);

      data.company = {
        connect: {
          id: updateTaskDto.companyId,
        },
      };

      if (
        currentTask.roomId &&
        updateTaskDto.roomId === undefined &&
        updateTaskDto.companyId !== currentTask.companyId
      ) {
        data.room = {
          disconnect: true,
        };
      }

      if (
        currentTask.equipmentId &&
        updateTaskDto.equipmentId === undefined &&
        updateTaskDto.companyId !== currentTask.companyId
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

  async remove(id: string) {
    await this.findOne(id);

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

  private parseDate(value: string, errorMessage: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(errorMessage);
    }

    return date;
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
