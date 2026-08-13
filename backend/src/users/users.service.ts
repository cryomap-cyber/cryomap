import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { Prisma, UserRole, UserStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

const userSelect = {
  id: true,
  companyId: true,
  name: true,
  email: true,
  phone: true,
  jobTitle: true,
  role: true,
  status: true,
  lastLoginAt: true,
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
} satisfies Prisma.UserSelect;

type SelectedUser = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, actor: AuthUser) {
    await this.ensureActorCanCreateUser(createUserDto, actor);

    const normalizedEmail = this.normalizeEmail(createUserDto.email);

    await this.ensureEmailIsAvailable(normalizedEmail);

    if (createUserDto.companyId) {
      await this.ensureCompanyExists(createUserDto.companyId);
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        companyId: createUserDto.companyId,
        name: createUserDto.name.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: createUserDto.phone?.trim(),
        jobTitle: createUserDto.jobTitle?.trim(),
        role: createUserDto.role ?? UserRole.TECHNICIAN,
        status: createUserDto.status ?? UserStatus.ACTIVE,
      },
      select: userSelect,
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      select: userSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, actor: AuthUser) {
    const targetUser = await this.findOne(id);

    await this.ensureActorCanUpdateUser(targetUser, updateUserDto, actor);

    const data: Prisma.UserUpdateInput = {};

    if (updateUserDto.companyId !== undefined) {
      if (updateUserDto.companyId === null) {
        data.company = {
          disconnect: true,
        };
      } else {
        await this.ensureCompanyExists(updateUserDto.companyId);

        data.company = {
          connect: {
            id: updateUserDto.companyId,
          },
        };
      }
    }

    if (updateUserDto.name !== undefined) {
      data.name = updateUserDto.name.trim();
    }

    if (updateUserDto.email !== undefined) {
      const normalizedEmail = this.normalizeEmail(updateUserDto.email);

      await this.ensureEmailIsAvailable(normalizedEmail, id);

      data.email = normalizedEmail;
    }

    if (updateUserDto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.phone !== undefined) {
      data.phone = updateUserDto.phone?.trim() || null;
    }

    if (updateUserDto.jobTitle !== undefined) {
      data.jobTitle = updateUserDto.jobTitle?.trim() || null;
    }

    if (updateUserDto.role !== undefined) {
      data.role = updateUserDto.role;
    }

    if (updateUserDto.status !== undefined) {
      data.status = updateUserDto.status;
    }

    return this.prisma.user.update({
      where: {
        id,
      },
      data,
      select: userSelect,
    });
  }

  async remove(id: string, actor: AuthUser) {
    const targetUser = await this.findOne(id);

    this.ensureActorCanRemoveUser(targetUser, actor);

    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        status: UserStatus.INACTIVE,
        deletedAt: new Date(),
      },
      select: userSelect,
    });
  }

  private async ensureActorCanCreateUser(
    createUserDto: CreateUserDto,
    actor: AuthUser,
  ) {
    if (
      actor.role !== UserRole.MASTER_ADMIN &&
      actor.role !== UserRole.SUPERVISOR
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para criar usuários',
      );
    }

    if (createUserDto.role === UserRole.MASTER_ADMIN) {
      throw new BadRequestException(
        'Não é permitido criar outro administrador master',
      );
    }

    const existingMasterAdmin = await this.prisma.user.findFirst({
      where: {
        role: UserRole.MASTER_ADMIN,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existingMasterAdmin) {
      throw new BadRequestException(
        'Administrador master principal não encontrado. Use o seed para criar o usuário master.',
      );
    }
  }

  private async ensureActorCanUpdateUser(
    targetUser: SelectedUser,
    updateUserDto: UpdateUserDto,
    actor: AuthUser,
  ) {
    if (targetUser.id === actor.id && updateUserDto.status !== undefined) {
      if (updateUserDto.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException(
          'Você não pode inativar ou bloquear o próprio usuário logado',
        );
      }
    }

    if (targetUser.role === UserRole.MASTER_ADMIN) {
      if (actor.role !== UserRole.MASTER_ADMIN || targetUser.id !== actor.id) {
        throw new ForbiddenException(
          'Somente o próprio administrador master pode editar o cadastro master',
        );
      }

      if (
        updateUserDto.role !== undefined &&
        updateUserDto.role !== UserRole.MASTER_ADMIN
      ) {
        throw new BadRequestException(
          'O administrador master principal não pode perder o perfil master',
        );
      }

      if (
        updateUserDto.status !== undefined &&
        updateUserDto.status !== UserStatus.ACTIVE
      ) {
        throw new BadRequestException(
          'O administrador master principal não pode ser inativado ou bloqueado',
        );
      }

      return;
    }

    if (updateUserDto.role === UserRole.MASTER_ADMIN) {
      throw new BadRequestException(
        'Não é permitido promover outro usuário para administrador master',
      );
    }
  }

  private ensureActorCanRemoveUser(targetUser: SelectedUser, actor: AuthUser) {
    if (targetUser.id === actor.id) {
      throw new ForbiddenException(
        'Você não pode inativar o próprio usuário logado',
      );
    }

    if (targetUser.role === UserRole.MASTER_ADMIN) {
      throw new ForbiddenException(
        'O administrador master não pode ser inativado',
      );
    }
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private async ensureEmailIsAvailable(email: string, currentUserId?: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (!existingUser) {
      return;
    }

    if (currentUserId && existingUser.id === currentUserId) {
      return;
    }

    throw new ConflictException('Já existe um usuário com este e-mail');
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
