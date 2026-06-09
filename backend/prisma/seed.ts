import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { PrismaClient, users_role } from '@prisma/client';
import { Pool } from 'pg';
import { getDatabaseUrl } from './db-url';

const pool = new Pool({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || 'admin@lds.gov.pk').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
const WATER_QUALITY_PASSWORD = process.env.DEFAULT_WATER_QUALITY_PASSWORD || 'Water@2025!';
const FORCE_RESET = process.env.SEED_ADMIN_RESET === 'true';

const WATER_QUALITY_USERS = [
  { name: 'Environmental Risk Analyst', email: 'ra.environment@prmsc.gov', role: users_role.RA_Environment },
  { name: 'PCRWR Field Sampler', email: 'sampler.pcrwr@prmsc.gov', role: users_role.PCRWR_Sampler },
  { name: 'PCRWR Lab Analyst', email: 'lab.pcrwr@prmsc.gov', role: users_role.PCRWR_Lab },
];

async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

async function nextSimpleId(): Promise<number> {
  const key = 'user-simple-id';
  const existing = await prisma.counters.findUnique({ where: { counter_key: key } });
  if (!existing) {
    await prisma.counters.create({ data: { counter_key: key, seq: BigInt(1) } });
    return 1;
  }
  const next = Number(existing.seq) + 1;
  await prisma.counters.update({ where: { id: existing.id }, data: { seq: BigInt(next) } });
  return next;
}

async function seedAdmin() {
  const existing = await prisma.users.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    if (FORCE_RESET) {
      await prisma.users.update({
        where: { id: existing.id },
        data: { password: await hashPassword(ADMIN_PASSWORD), updated_at: new Date() },
      });
      console.log(`Admin password reset (${ADMIN_EMAIL})`);
      return;
    }
    const valid = await bcrypt.compare(ADMIN_PASSWORD, existing.password);
    if (valid) {
      console.log(`Admin exists (${ADMIN_EMAIL}) — password OK`);
      return;
    }
    console.error(`Admin exists but password does not match. Run with SEED_ADMIN_RESET=true`);
    process.exit(1);
  }

  if (process.env.REQUIRE_STRONG_ADMIN_PASSWORD === 'true' && !process.env.SEED_ADMIN_PASSWORD) {
    console.error('Set SEED_ADMIN_PASSWORD before first production deploy.');
    process.exit(1);
  }

  const now = new Date();
  await prisma.users.create({
    data: {
      simple_id: await nextSimpleId(),
      name: 'System Administrator',
      email: ADMIN_EMAIL,
      password: await hashPassword(ADMIN_PASSWORD),
      role: users_role.Super_Admin,
      active_status: 'active',
      phone: '+92-300-0000000',
      created_at: now,
      updated_at: now,
    },
  });
  console.log(`Admin created (${ADMIN_EMAIL})`);
}

async function seedWaterQualityUsers() {
  for (const seed of WATER_QUALITY_USERS) {
    const existing = await prisma.users.findUnique({ where: { email: seed.email } });
    if (existing) {
      console.log(`Skip (exists): ${seed.email}`);
      continue;
    }
    const now = new Date();
    await prisma.users.create({
      data: {
        simple_id: await nextSimpleId(),
        name: seed.name,
        email: seed.email,
        password: await hashPassword(WATER_QUALITY_PASSWORD),
        role: seed.role,
        active_status: 'active',
        created_at: now,
        updated_at: now,
      },
    });
    console.log(`Created: ${seed.email}`);
  }
}

async function main() {
  await seedAdmin();
  await seedWaterQualityUsers();
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
