"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateProductionEnv = validateProductionEnv;
function validateProductionEnv() {
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
        return;
    }
    if (!process.env.JWT_SECRET) {
        console.error('FATAL: JWT_SECRET environment variable must be set in production');
        process.exit(1);
    }
    if (process.env.DATABASE_URL) {
        return;
    }
    const postgresRequired = ['POSTGRES_HOST', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'];
    const postgresMissing = postgresRequired.filter((key) => !process.env[key]);
    if (postgresMissing.length) {
        console.error(`FATAL: Missing PostgreSQL environment variables: ${postgresMissing.join(', ')}`);
        process.exit(1);
    }
}
//# sourceMappingURL=env.validation.js.map