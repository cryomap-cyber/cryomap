import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyStatus, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCompanyDto: CreateCompanyDto) {
    const normalizedCnpj = this.normalizeCnpj(createCompanyDto.cnpj);

    await this.ensureCnpjIsAvailable(normalizedCnpj);

    return this.prisma.company.create({
      data: {
        name: createCompanyDto.name.trim(),
        cnpj: normalizedCnpj,
        responsibleName: createCompanyDto.responsibleName?.trim(),
        email: createCompanyDto.email?.trim().toLowerCase(),
        phone: createCompanyDto.phone?.trim(),
        address: createCompanyDto.address?.trim(),
        city: createCompanyDto.city?.trim(),
        state: createCompanyDto.state?.trim().toUpperCase(),
        plan: createCompanyDto.plan?.trim(),
        notes: createCompanyDto.notes?.trim(),
        status: CompanyStatus.ACTIVE,
      },
    });
  }

  async findAll() {
    return this.prisma.company.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto) {
    await this.findOne(id);

    const data: Prisma.CompanyUpdateInput = {};

    if (updateCompanyDto.name !== undefined) {
      data.name = updateCompanyDto.name.trim();
    }

    if (updateCompanyDto.cnpj !== undefined) {
      const normalizedCnpj = this.normalizeCnpj(updateCompanyDto.cnpj);

      await this.ensureCnpjIsAvailable(normalizedCnpj, id);

      data.cnpj = normalizedCnpj;
    }

    if (updateCompanyDto.responsibleName !== undefined) {
      data.responsibleName = updateCompanyDto.responsibleName?.trim();
    }

    if (updateCompanyDto.email !== undefined) {
      data.email = updateCompanyDto.email?.trim().toLowerCase();
    }

    if (updateCompanyDto.phone !== undefined) {
      data.phone = updateCompanyDto.phone?.trim();
    }

    if (updateCompanyDto.address !== undefined) {
      data.address = updateCompanyDto.address?.trim();
    }

    if (updateCompanyDto.city !== undefined) {
      data.city = updateCompanyDto.city?.trim();
    }

    if (updateCompanyDto.state !== undefined) {
      data.state = updateCompanyDto.state?.trim().toUpperCase();
    }

    if (updateCompanyDto.status !== undefined) {
      data.status = updateCompanyDto.status;
    }

    if (updateCompanyDto.plan !== undefined) {
      data.plan = updateCompanyDto.plan?.trim();
    }

    if (updateCompanyDto.notes !== undefined) {
      data.notes = updateCompanyDto.notes?.trim();
    }

    return this.prisma.company.update({
      where: {
        id,
      },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.company.update({
      where: {
        id,
      },
      data: {
        status: CompanyStatus.INACTIVE,
        deletedAt: new Date(),
      },
    });
  }

  private normalizeCnpj(cnpj: string) {
    return cnpj.replace(/\D/g, '');
  }

  private async ensureCnpjIsAvailable(cnpj: string, currentCompanyId?: string) {
    const existingCompany = await this.prisma.company.findUnique({
      where: {
        cnpj,
      },
    });

    if (!existingCompany) {
      return;
    }

    if (currentCompanyId && existingCompany.id === currentCompanyId) {
      return;
    }

    throw new ConflictException('Já existe uma empresa com este CNPJ');
  }
}
