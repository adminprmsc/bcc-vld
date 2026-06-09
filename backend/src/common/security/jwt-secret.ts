import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

let devSecret: string | null = null;

export function resolveJwtSecret(config?: ConfigService): string {
  const fromEnv = config?.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
  if (fromEnv) {
    return fromEnv;
  }

  const isProduction = (config?.get<string>('NODE_ENV') || process.env.NODE_ENV) === 'production';
  if (isProduction) {
    console.error('FATAL: JWT_SECRET must be set in production environment');
    process.exit(1);
  }

  if (!devSecret) {
    devSecret = randomBytes(32).toString('hex');
    console.warn('WARNING: JWT_SECRET not set. Using random development secret.');
    console.warn('         Tokens will be invalidated on server restart.');
  }
  return devSecret;
}
