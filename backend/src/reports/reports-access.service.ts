import { ForbiddenException, Injectable } from '@nestjs/common';

import type { AuthUser } from '../auth/types/auth-user.type.js';
import { UserRole } from '../generated/prisma/client.js';
import { ReportsQueryDto } from './dto/reports-query.dto.js';

@Injectable()
export class ReportsAccessService {
  resolveQuery(query: ReportsQueryDto, actor: AuthUser): ReportsQueryDto {
    if (actor.role === UserRole.TECHNICIAN) {
      throw new ForbiddenException('Técnico não pode acessar relatórios');
    }

    if (actor.role === UserRole.CLIENT_USER) {
      if (!actor.companyId) {
        throw new ForbiddenException(
          'Usuário cliente não está vinculado a uma empresa',
        );
      }

      return {
        ...query,
        companyId: actor.companyId,
      };
    }

    return query;
  }
}
