# LDS Backend Architecture

NestJS API with **Prisma ORM** and **PostgreSQL**.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | NestJS 10 |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Database | PostgreSQL 16 |
| Auth | JWT + Passport |
| Migrations | `prisma/migrations/` |
| Seeds | `prisma/seed.ts` |

## NPM scripts

| Command | Purpose |
|---------|---------|
| `npm run generate` | Regenerate Prisma Client |
| `npm run migrate` | `prisma migrate deploy` |
| `npm run migrate:dev` | Create/apply migrations in dev |
| `npm run seed` | Run `prisma/seed.ts` |
| `npm run build` | Nest compile (`postinstall` runs `prisma generate`) |
| `npm run start:dev` | Dev server with watch |
| `npm run start:prod` | Run compiled API |

Deploy runs `npm run migrate` and `npm run seed` in the backend container after PostgreSQL is up.

## Docker

- **Dockerfile** — multi-stage build, non-root user, `CMD node dist/main.js`
- Migrations are **not** run at container start; use `./deploy/local.sh up` or `./deploy/production.sh deploy`

## Structure

```
backend/
├── prisma/schema.prisma, seed.ts, migrations/, db-url.ts
├── prisma.config.ts
└── src/
    ├── main.ts
    ├── prisma/prisma.service.ts
    └── modules/…
```

## Local development (without Docker)

```bash
cd backend
npm install
npm run migrate:dev
npm run seed
npm run start:dev
```

Set `POSTGRES_*` in `backend/.env` or `DATABASE_URL` (see `prisma/db-url.ts`).
