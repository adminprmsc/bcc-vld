"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveJwtSecret = resolveJwtSecret;
const crypto_1 = require("crypto");
let devSecret = null;
function resolveJwtSecret(config) {
    const fromEnv = config?.get('JWT_SECRET') || process.env.JWT_SECRET;
    if (fromEnv) {
        return fromEnv;
    }
    const isProduction = (config?.get('NODE_ENV') || process.env.NODE_ENV) === 'production';
    if (isProduction) {
        console.error('FATAL: JWT_SECRET must be set in production environment');
        process.exit(1);
    }
    if (!devSecret) {
        devSecret = (0, crypto_1.randomBytes)(32).toString('hex');
        console.warn('WARNING: JWT_SECRET not set. Using random development secret.');
        console.warn('         Tokens will be invalidated on server restart.');
    }
    return devSecret;
}
//# sourceMappingURL=jwt-secret.js.map