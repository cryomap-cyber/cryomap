import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL não foi definida no arquivo .env');
  }

  const masterAdminName =
    process.env.SEED_MASTER_ADMIN_NAME ?? 'Administrador CryoMap';

  const masterAdminEmail =
    process.env.SEED_MASTER_ADMIN_EMAIL ?? 'admin@cryomap.local';

  const masterAdminPassword =
    process.env.SEED_MASTER_ADMIN_PASSWORD ?? 'Admin@123456';

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
  });

  const prisma = new PrismaClient({
    adapter,
  });

  const passwordHash = await bcrypt.hash(masterAdminPassword, 10);

  const masterAdminRole = 'MASTER_ADMIN' as const;
  const activeStatus = 'ACTIVE' as const;

  await prisma.user.upsert({
    where: {
      email: masterAdminEmail,
    },
    update: {
      name: masterAdminName,
      passwordHash,
      role: masterAdminRole,
      status: activeStatus,
    },
    create: {
      name: masterAdminName,
      email: masterAdminEmail,
      passwordHash,
      role: masterAdminRole,
      status: activeStatus,
    },
  });

  console.log(`Master Admin criado ou atualizado: ${masterAdminEmail}`);

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
