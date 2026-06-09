# MySQL Migrations

Schema is managed exclusively through **Sequelize migrations** against **MySQL**.  
There is no MongoDB and no `syncDatabase()` at runtime.

## Folder structure

```
migrations/
├── README.md
├── 20260608120000-baseline.js           # Initial schema (empty DB only)
└── 20260608120100-ensure-audit-logs.js  # Additive fix for older DBs
```

New changes → add `YYYYMMDDHHMMSS-description.js` files here.

## Commands

```bash
npm run db:migrate              # Apply pending migrations
npm run db:migrate:status       # Show status
npm run db:migrate:generate -- --name your-change-name
```

Production:

```bash
./deploy/production.sh migrate
```

## When migrations run

| Trigger | Behaviour |
|---------|-----------|
| `npm start` / `bin/www` | Runs pending migrations (unless `SKIP_MIGRATIONS=true`) |
| `./deploy/production.sh deploy` | Runs migrations before health checks |
| Docker backend | `SKIP_MIGRATIONS=true` — deploy script handles migrations |

## Add a schema change

```bash
npm run db:migrate:generate -- --name add-users-department
```

Edit the generated file:

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'department', {
      type: Sequelize.STRING(100),
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'department');
  }
};
```

```bash
npm run db:migrate
```

## Rules

- **Single database:** MySQL only (`MYSQL_*` env vars via `config/database.js`)
- **Never** call `sequelize.sync()` from `app.js`, routes, or services
- **Never** store backups as Mongo exports — use `./deploy/production.sh backup` (`mysqldump`)
- Baseline migration only runs when `users` table does not exist
- All new tables/columns/indexes → new migration files with explicit `up`/`down`

## Seeds (data, not schema)

| Script | Command |
|--------|---------|
| Admin user | `npm run seed:admin` |
| Water quality users | `npm run seed:water-users` |

See also: `backend/database/README.md`
