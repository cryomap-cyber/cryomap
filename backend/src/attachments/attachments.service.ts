import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AuthUser } from '../auth/types/auth-user.type.js';
import {
  AttachmentType,
  Prisma,
  UserRole,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAttachmentDto } from './dto/create-attachment.dto.js';
import { FindAttachmentsDto } from './dto/find-attachments.dto.js';

const attachmentSelect = {
  id: true,
  companyId: true,
  taskId: true,
  serviceRecordId: true,
  uploadedByUserId: true,
  fileName: true,
  originalName: true,
  mimeType: true,
  size: true,
  path: true,
  type: true,
  createdAt: true,
  deletedAt: true,
  company: {
    select: {
      id: true,
      name: true,
      cnpj: true,
      status: true,
    },
  },
  task: {
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
    },
  },
  serviceRecord: {
    select: {
      id: true,
      taskId: true,
      startedAt: true,
      finishedAt: true,
      downtimeMinutes: true,
    },
  },
  uploadedByUser: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  },
} satisfies Prisma.AttachmentSelect;

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createDto: CreateAttachmentDto,
    file: Express.Multer.File | undefined,
    actor: AuthUser,
  ) {
    this.ensureCanWrite(actor);

    if (!file) {
      throw new BadRequestException('Arquivo não enviado');
    }

    const resolvedLinks = await this.resolveLinks(createDto);

    this.ensureCanAccessCompany(resolvedLinks.companyId, actor);

    return this.prisma.attachment.create({
      data: {
        companyId: resolvedLinks.companyId,
        taskId: resolvedLinks.taskId,
        serviceRecordId: resolvedLinks.serviceRecordId,
        uploadedByUserId: actor.id,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: `uploads/attachments/${file.filename}`,
        type: createDto.type ?? AttachmentType.OTHER,
      },
      select: attachmentSelect,
    });
  }

  async findAll(filters: FindAttachmentsDto, actor: AuthUser) {
    const where: Prisma.AttachmentWhereInput = {
      deletedAt: null,
    };

    const scopedCompanyId = this.resolveReadCompanyId(filters.companyId, actor);

    if (scopedCompanyId) {
      where.companyId = scopedCompanyId;
    }

    if (filters.taskId) {
      where.taskId = filters.taskId;
    }

    if (filters.serviceRecordId) {
      where.serviceRecordId = filters.serviceRecordId;
    }

    if (filters.uploadedByUserId) {
      where.uploadedByUserId = filters.uploadedByUserId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    return this.prisma.attachment.findMany({
      where,
      select: attachmentSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    });
  }

  async findOne(id: string, actor: AuthUser) {
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: attachmentSelect,
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    this.ensureCanAccessCompany(attachment.companyId, actor);

    return attachment;
  }

  async remove(id: string, actor: AuthUser) {
    this.ensureCanWrite(actor);

    await this.findOne(id, actor);

    return this.prisma.attachment.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
      select: attachmentSelect,
    });
  }

  private ensureCanWrite(actor: AuthUser) {
    if (actor.role === UserRole.CLIENT_USER) {
      throw new ForbiddenException('Usuário cliente não pode alterar anexos');
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

  private ensureCanAccessCompany(
    companyId: string | null | undefined,
    actor: AuthUser,
  ) {
    if (
      actor.role !== UserRole.CLIENT_USER &&
      actor.role !== UserRole.TECHNICIAN
    ) {
      return;
    }

    if (!companyId || !actor.companyId || actor.companyId !== companyId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta empresa',
      );
    }
  }

  private async resolveLinks(createDto: CreateAttachmentDto) {
    if (
      !createDto.companyId &&
      !createDto.taskId &&
      !createDto.serviceRecordId
    ) {
      throw new BadRequestException(
        'Informe companyId, taskId ou serviceRecordId para vincular o anexo',
      );
    }

    let companyId = createDto.companyId;
    let taskId = createDto.taskId;
    const serviceRecordId = createDto.serviceRecordId;

    if (serviceRecordId) {
      const serviceRecord = await this.prisma.serviceRecord.findFirst({
        where: {
          id: serviceRecordId,
          deletedAt: null,
        },
        select: {
          id: true,
          companyId: true,
          taskId: true,
        },
      });

      if (!serviceRecord) {
        throw new NotFoundException('Registro de atendimento não encontrado');
      }

      if (companyId && companyId !== serviceRecord.companyId) {
        throw new BadRequestException(
          'O anexo não pertence à empresa do atendimento informado',
        );
      }

      if (taskId && taskId !== serviceRecord.taskId) {
        throw new BadRequestException(
          'O anexo não pertence à tarefa do atendimento informado',
        );
      }

      companyId = serviceRecord.companyId;
      taskId = serviceRecord.taskId;
    }

    if (taskId) {
      const task = await this.prisma.task.findFirst({
        where: {
          id: taskId,
          deletedAt: null,
        },
        select: {
          id: true,
          companyId: true,
        },
      });

      if (!task) {
        throw new NotFoundException('Tarefa não encontrada');
      }

      if (companyId && companyId !== task.companyId) {
        throw new BadRequestException(
          'O anexo não pertence à empresa da tarefa informada',
        );
      }

      companyId = task.companyId;
    }

    if (!companyId) {
      throw new BadRequestException(
        'Não foi possível identificar a empresa do anexo',
      );
    }

    await this.ensureCompanyExists(companyId);

    return {
      companyId,
      taskId,
      serviceRecordId,
    };
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
}
