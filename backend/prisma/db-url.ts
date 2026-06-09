export function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const user = process.env.POSTGRES_USER || 'lds_user';
  const password = encodeURIComponent(process.env.POSTGRES_PASSWORD || '');
  const database = process.env.POSTGRES_DB || 'lds_db';
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}
