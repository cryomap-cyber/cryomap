import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import type { AuthUser } from './types/auth-user.type.js';
import type { JwtPayload } from './types/jwt-payload.type.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        email: true,
        passwordHash: true,
        phone: true,
        jobTitle: true,
        profileImagePath: true,
        role: true,
        status: true,
        company: {
          select: {
            id: true,
            name: true,
            cnpj: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuário inativo ou bloqueado');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const jwtExpiresInSeconds = Number(
      this.configService.get<string>('JWT_EXPIRES_IN_SECONDS') ?? 86400,
    );

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: jwtExpiresInSeconds,
    });

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      user: this.toAuthUser(user),
    };
  }

  async getAuthenticatedUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        email: true,
        phone: true,
        jobTitle: true,
        profileImagePath: true,
        role: true,
        status: true,
        company: {
          select: {
            id: true,
            name: true,
            cnpj: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuário inativo ou bloqueado');
    }

    return this.toAuthUser(user);
  }

  private toAuthUser(user: {
    id: string;
    companyId: string | null;
    name: string;
    email: string;
    phone: string | null;
    jobTitle: string | null;
    profileImagePath: string | null;
    role: AuthUser['role'];
    status: AuthUser['status'];
    company: AuthUser['company'];
  }): AuthUser {
    return {
      id: user.id,
      companyId: user.companyId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      jobTitle: user.jobTitle,
      role: user.role,
      status: user.status,
      hasProfileImage: Boolean(user.profileImagePath),
      company: user.company,
    };
  }
}
