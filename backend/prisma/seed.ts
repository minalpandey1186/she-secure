import { PrismaClient, AuthorityRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial authority accounts into database...');

  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const operatorPasswordHash = await bcrypt.hash('OperatorPassword123!', 10);
  const viewerPasswordHash = await bcrypt.hash('ViewerPassword123!', 10);

  await prisma.authority.upsert({
    where: { email: 'admin@shesecure.org' },
    update: {},
    create: {
      id: 'auth-admin-01',
      email: 'admin@shesecure.org',
      name: 'Commander Sarah Connor',
      role: AuthorityRole.ADMIN,
      passwordHash: adminPasswordHash,
      isActive: true
    }
  });

  await prisma.authority.upsert({
    where: { email: 'operator@shesecure.org' },
    update: {},
    create: {
      id: 'auth-operator-01',
      email: 'operator@shesecure.org',
      name: 'Dispatch Operator Alex Rivera',
      role: AuthorityRole.OPERATOR,
      passwordHash: operatorPasswordHash,
      isActive: true
    }
  });

  await prisma.authority.upsert({
    where: { email: 'viewer@shesecure.org' },
    update: {},
    create: {
      id: 'auth-viewer-01',
      email: 'viewer@shesecure.org',
      name: 'Auditor Maya Patel',
      role: AuthorityRole.VIEWER,
      passwordHash: viewerPasswordHash,
      isActive: true
    }
  });

  console.log('Database seeded successfully: admin, operator, and viewer ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
