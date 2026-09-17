import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';

import type { AuthUser } from '../auth/types/auth-user.type.js';
import { Prisma, UserRole, UserStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

const companySelect = {
  id: true,
  name: true,
  cnpj: true,
  status: true,
} satisfies Prisma.CompanySelect;

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
    select: companySelect,
  },
} satisfies Prisma.UserSelect;

const ownProfileSelect = {
  id: true,
  companyId: true,
  name: true,
  email: true,
  phone: true,
  jobTitle: true,
  profileImagePath: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  company: {
    select: companySelect,
  },
} satisfies Prisma.UserSelect;

type SelectedUser = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>;

type SelectedOwnProfile = Prisma.UserGetPayload<{
  select: typeof ownProfileSelect;
}>;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

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

  async findOwnProfile(actor: AuthUser) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: actor.id,
        deletedAt: null,
      },
      select: ownProfileSelect,
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.toOwnProfile(user);
  }

  async updateOwnProfile(
    updateOwnProfileDto: UpdateOwnProfileDto,
    actor: AuthUser,
  ) {
    this.ensureActorCanEditOwnProfile(actor);

    await this.findOwnProfile(actor);

    const data: Prisma.UserUpdateInput = {};

    if (updateOwnProfileDto.name !== undefined) {
      const name = updateOwnProfileDto.name.trim();

      if (name.length < 2) {
        throw new BadRequestException(
          'O nome deve ter pelo menos 2 caracteres',
        );
      }

      data.name = name;
    }

    if (updateOwnProfileDto.email !== undefined) {
      const normalizedEmail = this.normalizeEmail(updateOwnProfileDto.email);

      await this.ensureEmailIsAvailable(normalizedEmail, actor.id);

      data.email = normalizedEmail;
    }

    if (updateOwnProfileDto.phone !== undefined) {
      data.phone = updateOwnProfileDto.phone?.trim() || null;
    }

    if (updateOwnProfileDto.jobTitle !== undefined) {
      data.jobTitle = updateOwnProfileDto.jobTitle?.trim() || null;
    }

    const user = await this.prisma.user.update({
      where: {
        id: actor.id,
      },
      data,
      select: ownProfileSelect,
    });

    return this.toOwnProfile(user);
  }

  async updateOwnProfileImage(
    file: Express.Multer.File | undefined,
    actor: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('Imagem de perfil não enviada');
    }

    const currentUser = await this.prisma.user.findFirst({
      where: {
        id: actor.id,
        deletedAt: null,
      },
      select: {
        id: true,
        profileImagePath: true,
      },
    });

    if (!currentUser) {
      await this.removeProfileImageFileByName(file.filename);
      throw new NotFoundException('Usuário não encontrado');
    }

    const newProfileImagePath = `uploads/profile-images/${file.filename}`;

    let updatedUser: SelectedOwnProfile;

    try {
      updatedUser = await this.prisma.user.update({
        where: {
          id: actor.id,
        },
        data: {
          profileImagePath: newProfileImagePath,
        },
        select: ownProfileSelect,
      });
    } catch (error) {
      await this.removeProfileImageFileByName(file.filename);
      throw error;
    }

    if (
      currentUser.profileImagePath &&
      currentUser.profileImagePath !== newProfileImagePath
    ) {
      await this.removeProfileImageFile(currentUser.profileImagePath);
    }

    return this.toOwnProfile(updatedUser);
  }

  async getOwnProfileImage(actor: AuthUser) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: actor.id,
        deletedAt: null,
      },
      select: {
        profileImagePath: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (!user.profileImagePath) {
      throw new NotFoundException('Foto de perfil não encontrada');
    }

    const absolutePath = this.getProfileImageAbsolutePath(
      user.profileImagePath,
    );

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Arquivo da foto de perfil não encontrado');
    }

    return {
      absolutePath,
    };
  }

  async removeOwnProfileImage(actor: AuthUser) {
    const currentUser = await this.prisma.user.findFirst({
      where: {
        id: actor.id,
        deletedAt: null,
      },
      select: {
        id: true,
        profileImagePath: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const oldProfileImagePath = currentUser.profileImagePath;

    const updatedUser = await this.prisma.user.update({
      where: {
        id: actor.id,
      },
      data: {
        profileImagePath: null,
      },
      select: ownProfileSelect,
    });

    if (oldProfileImagePath) {
      await this.removeProfileImageFile(oldProfileImagePath);
    }

    return this.toOwnProfile(updatedUser);
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

    this.ensureActorCanUpdateUser(targetUser, updateUserDto, actor);

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

  private toOwnProfile(user: SelectedOwnProfile) {
    return {
      id: user.id,
      companyId: user.companyId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      jobTitle: user.jobTitle,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      hasProfileImage: Boolean(user.profileImagePath),
      company: user.company,
    };
  }

  private getProfileImageAbsolutePath(profileImagePath: string) {
    const fileName = basename(profileImagePath);

    return join(process.cwd(), '..', 'uploads', 'profile-images', fileName);
  }

  private async removeProfileImageFile(profileImagePath: string) {
    const absolutePath = this.getProfileImageAbsolutePath(profileImagePath);

    try {
      await unlink(absolutePath);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return;
      }

      this.logger.warn(
        `Não foi possível remover a foto de perfil antiga: ${absolutePath}`,
      );
    }
  }

  private async removeProfileImageFileByName(fileName: string) {
    await this.removeProfileImageFile(
      `uploads/profile-images/${basename(fileName)}`,
    );
  }

  private ensureActorCanEditOwnProfile(actor: AuthUser) {
    if (
      actor.role !== UserRole.MASTER_ADMIN &&
      actor.role !== UserRole.SUPERVISOR
    ) {
      throw new ForbiddenException(
        'Somente administradores master e supervisores podem alterar dados de perfil',
      );
    }
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

  private ensureActorCanUpdateUser(
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
