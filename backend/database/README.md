# LDS Database (MySQL only)

This application uses **MySQL 8** with **Sequelize**. There is no MongoDB layer.

## Layout

```
backend/
├── config/
│   ├── database.js              # Single Sequelize instance + mysqlConfig
│   └── sequelize-cli-config.js  # Re-exports mysqlConfig for CLI
├── models-sql/                  # ORM models (= schema definition)
├── migrations/                  # Versioned schema changes (source of truth at deploy)
├── lib/
│   ├── migrator.js              # Runs pending migrations
│   └── schema.js                # Migration-only schema helpers
└── scripts/
    ├── run-migrations.js
    ├── seed-admin.js
    └── seed-water-quality-users.js
```

## Connectivity (one path)

| Layer | Module | Connection |
|-------|--------|------------|
| Express API | `config/database.js` → `sequelize` | `MYSQL_*` env vars |
| Migrations | `sequelize-cli` → same `mysqlConfig` | Same `MYSQL_*` env vars |
| Seeds | `models-sql` + `sequelize` | Same `MYSQL_*` env vars |
| Backups | `mysqldump` via `./deploy/production.sh backup` | MySQL only |

Environment variables:

```
MYSQL_HOST=mysql          # Docker service name in production
MYSQL_PORT=3306
MYSQL_DATABASE=lds_db
MYSQL_USER=lds_user
MYSQL_PASSWORD=...
```

## Schema workflow

1. **Models** (`models-sql/`) define tables, columns, indexes, associations.
2. **Migrations** (`migrations/`) apply changes in order; tracked in `SequelizeMeta`.
3. **Deploy** runs `./deploy/production.sh migrate` before serving traffic.
4. **Never** call `sequelize.sync()` from routes or `app.js`.

### Add a schema change

```bash
cd backend
npm run db:migrate:generate -- --name add-users-department
# Edit migrations/<timestamp>-add-users-department.js
npm run db:migrate
```

## Backups

Backups are **MySQL dumps only** (`mysqldump`), not application-level JSON/Mongo exports:

```bash
./deploy/production.sh backup    # → backups/YYYYMMDD_HHMMSS/mysql.sql.gz
```

Restore:

```bash
./deploy/production.sh restore backups/YYYYMMDD_HHMMSS
```
