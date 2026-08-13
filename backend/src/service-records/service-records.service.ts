import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AuthUser } from '../auth/types/auth-user.type.js';
import {
  Prisma,
  TaskStatus,
  UserRole,
  UserStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateServiceRecordDto } from './dto/create-service-record.dto.js';
import { FindServiceRecordsDto } from './dto/find-service-records.dto.js';
import { UpdateServiceRecordDto } from './dto/update-service-record.dto.js';

const serviceRecordSelect = {
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
  notes: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  task: {
    select: {
      id: true,
      title: true,
      priority: true,
      status: true,
      dueDate: true,
      startedAt: true,
      finishedAt: true,
      completedAt: true,
    },
  },
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
  technician: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  },
} satisfies Prisma.ServiceRecordSelect;

@Injectable()
export class ServiceRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateServiceRecordDto, actor: AuthUser) {
    this.ensureCanWrite(actor);

    const task = await this.ensureTaskExists(createDto.taskId);

    this.ensureCanAccessCompany(task.companyId, actor);

    if (task.status === TaskStatus.CANCELED) {
      throw new BadRequestException(
        'Não é possível iniciar atendimento em uma tarefa cancelada',
      );
    }

    await this.ensureTaskHasNoServiceRecord(createDto.taskId);

    const technicianId =
      createDto.technicianId ?? task.assignedToUserId ?? actor.id;

    if (technicianId) {
      await this.ensureTechnicianExists(technicianId, task.companyId);
    }

    const startedAt = createDto.startedAt
      ? this.parseDate(createDto.startedAt, 'Data inicial inválida')
      : new Date();

    const finishedAt = createDto.finishedAt
      ? this.parseDate(createDto.finishedAt, 'Data final inválida')
      : null;

    this.validatePeriod(startedAt, finishedAt);

    const downtimeMinutes = this.calculateDowntimeMinutes(
      startedAt,
      finishedAt,
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: {
          id: task.id,
        },
        data: {
          status: finishedAt ? TaskStatus.DONE : TaskStatus.IN_PROGRESS,
          startedAt,
          finishedAt,
          completedAt: finishedAt,
        },
      });

      return tx.serviceRecord.create({
        data: {
          task: {
            connect: {
              id: task.id,
            },
          },
          company: {
            connect: {
              id: task.companyId,
            },
          },
          room: task.roomId
            ? {
                connect: {
                  id: task.roomId,
                },
              }
            : undefined,
          equipment: task.equipmentId
            ? {
                connect: {
                  id: task.equipmentId,
                },
              }
            : undefined,
          technician: technicianId
            ? {
                connect: {
                  id: technicianId,
                },
              }
            : undefined,
          startedAt,
          finishedAt,
          downtimeMinutes,
          problemFound: createDto.problemFound?.trim(),
          servicePerformed: createDto.servicePerformed?.trim(),
          notes: createDto.notes?.trim(),
        },
        select: serviceRecordSelect,
      });
    });
  }

  async findAll(filters: FindServiceRecordsDto, actor: AuthUser) {
    const where: Prisma.ServiceRecordWhereInput = {
      deletedAt: null,
    };

    const scopedCompanyId = this.resolveReadCompanyId(filters.companyId, actor);

    if (filters.taskId) {
      where.taskId = filters.taskId;
    }

    if (scopedCompanyId) {
      where.companyId = scopedCompanyId;
    }

    if (filters.roomId) {
      where.roomId = filters.roomId;
    }

    if (filters.equipmentId) {
      where.equipmentId = filters.equipmentId;
    }

    if (filters.technicianId) {
      where.technicianId = filters.technicianId;
    }

    if (filters.startDate || filters.endDate) {
      where.startedAt = {};

      if (filters.startDate) {
        where.startedAt.gte = this.parseDate(
          filters.startDate,
          'Data inicial inválida',
        );
      }

      if (filters.endDate) {
        where.startedAt.lte = this.parseDate(
          filters.endDate,
          'Data final inválida',
        );
      }
    }

    return this.prisma.serviceRecord.findMany({
      where,
      select: serviceRecordSelect,
      orderBy: {
        startedAt: 'desc',
      },
      take: 200,
    });
  }

  async findOne(id: string, actor: AuthUser) {
    const serviceRecord = await this.prisma.serviceRecord.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: serviceRecordSelect,
    });

    if (!serviceRecord) {
      throw new NotFoundException('Registro de atendimento não encontrado');
    }

    this.ensureCanAccessCompany(serviceRecord.companyId, actor);

    return serviceRecord;
  }

  async update(id: string, updateDto: UpdateServiceRecordDto, actor: AuthUser) {
    this.ensureCanWrite(actor);

    const currentRecord = await this.findOne(id, actor);

    const nextStartedAt = updateDto.startedAt
      ? this.parseDate(updateDto.startedAt, 'Data inicial inválida')
      : currentRecord.startedAt;

    const nextFinishedAt =
      updateDto.finishedAt === undefined
        ? currentRecord.finishedAt
        : updateDto.finishedAt === null
          ? null
          : this.parseDate(updateDto.finishedAt, 'Data final inválida');

    this.validatePeriod(nextStartedAt, nextFinishedAt);

    const downtimeMinutes = this.calculateDowntimeMinutes(
      nextStartedAt,
      nextFinishedAt,
    );

    const data: Prisma.ServiceRecordUpdateInput = {
      startedAt: nextStartedAt,
      finishedAt: nextFinishedAt,
      downtimeMinutes,
    };

    if (updateDto.technicianId !== undefined) {
      if (updateDto.technicianId === null) {
        data.technician = {
          disconnect: true,
        };
      } else {
        await this.ensureTechnicianExists(
          updateDto.technicianId,
          currentRecord.companyId,
        );

        data.technician = {
          connect: {
            id: updateDto.technicianId,
          },
        };
      }
    }

    if (updateDto.problemFound !== undefined) {
      data.problemFound = updateDto.problemFound?.trim() || null;
    }

    if (updateDto.servicePerformed !== undefined) {
      data.servicePerformed = updateDto.servicePerformed?.trim() || null;
    }

    if (updateDto.notes !== undefined) {
      data.notes = updateDto.notes?.trim() || null;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: {
          id: currentRecord.taskId,
        },
        data: {
          status: nextFinishedAt ? TaskStatus.DONE : TaskStatus.IN_PROGRESS,
          startedAt: nextStartedAt,
          finishedAt: nextFinishedAt,
          completedAt: nextFinishedAt,
        },
      });

      return tx.serviceRecord.update({
        where: {
          id,
        },
        data,
        select: serviceRecordSelect,
      });
    });
  }

  async remove(id: string, actor: AuthUser) {
    this.ensureCanWrite(actor);

    const currentRecord = await this.findOne(id, actor);

    return this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: {
          id: currentRecord.taskId,
        },
        data: {
          status: TaskStatus.OPEN,
          startedAt: null,
          finishedAt: null,
          completedAt: null,
        },
      });

      return tx.serviceRecord.update({
        where: {
          id,
        },
        data: {
          deletedAt: new Date(),
        },
        select: serviceRecordSelect,
      });
    });
  }

  private ensureCanWrite(actor: AuthUser) {
    if (actor.role === UserRole.CLIENT_USER) {
      throw new ForbiddenException(
        'Usuário cliente não pode alterar atendimentos técnicos',
      );
    }

    if (actor.role === UserRole.TECHNICIAN && !actor.companyId) {
      throw new ForbiddenException('Técnico não está vinculado a uma empresa');
    }
  }

  private resolveReadCompanyId(
    requestedCompanyId: string | undefined,
    actor: AuthUser,
  ) {
    if (
      actor.role === UserRole.CLIENT_USER ||
      actor.role === UserRole.TECHNICIAN
    ) {
      if (!actor.companyId) {
        throw new ForbiddenException(
          'Usuário não está vinculado a uma empresa',
        );
      }

      return actor.companyId;
    }

    return requestedCompanyId;
  }

  private ensureCanAccessCompany(companyId: string, actor: AuthUser) {
    if (
      actor.role !== UserRole.CLIENT_USER &&
      actor.role !== UserRole.TECHNICIAN
    ) {
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

  private validatePeriod(startedAt: Date, finishedAt: Date | null) {
    if (finishedAt && finishedAt < startedAt) {
      throw new BadRequestException(
        'A data final não pode ser anterior à data inicial',
      );
    }
  }

  private calculateDowntimeMinutes(startedAt: Date, finishedAt: Date | null) {
    if (!finishedAt) {
      return null;
    }

    return Math.max(
      0,
      Math.round((finishedAt.getTime() - startedAt.getTime()) / 60000),
    );
  }

  private async ensureTaskExists(taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
      },
      select: {
        id: true,
        companyId: true,
        roomId: true,
        equipmentId: true,
        assignedToUserId: true,
        status: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    return task;
  }

  private async ensureTaskHasNoServiceRecord(taskId: string) {
    const existingRecord = await this.prisma.serviceRecord.findUnique({
      where: {
        taskId,
      },
      select: {
        id: true,
      },
    });

    if (existingRecord) {
      throw new ConflictException(
        'Esta tarefa já possui um registro de atendimento',
      );
    }
  }

  private async ensureTechnicianExists(
    technicianId: string,
    companyId: string,
  ) {
    const technician = await this.prisma.user.findFirst({
      where: {
        id: technicianId,
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

    if (!technician) {
      throw new NotFoundException(
        'Técnico não encontrado ou não pertence à empresa informada',
      );
    }
  }
}
