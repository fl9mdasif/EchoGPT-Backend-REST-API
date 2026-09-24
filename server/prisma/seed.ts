import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const SEED_PASSWORD = 'ChangeMe123!';

async function upsertUser(email: string, role: 'ADMIN' | 'USER', plan: 'FREE' | 'PREMIUM') {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      role,
      isEmailVerified: true,
      subscription: {
        create: {
          plan,
          requestsLimit: plan === 'PREMIUM' ? 5000 : 50,
        },
      },
    },
  });

  return user;
}

async function main() {
  await prisma.$connect();

  const admin = await upsertUser('admin@echogpt.dev', 'ADMIN', 'PREMIUM');
  const demoUser = await upsertUser('demo@echogpt.dev', 'USER', 'FREE');

  await prisma.aiProvider.upsert({
    where: { id: 'seed-openai-provider' },
    update: {},
    create: {
      id: 'seed-openai-provider',
      name: 'OpenAI (default)',
      type: 'OPENAI',
      isEnabled: true,
      isDefault: true,
    },
  });

  console.log('Seeded:');
  console.log(`  admin: ${admin.email} / ${SEED_PASSWORD}`);
  console.log(`  user:  ${demoUser.email} / ${SEED_PASSWORD}`);
  console.log('  ai-provider: OpenAI (default, global)');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
