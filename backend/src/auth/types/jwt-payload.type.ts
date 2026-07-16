import type { UserRole } from '../../generated/prisma/client.js';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};
