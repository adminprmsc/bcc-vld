"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = require("path");
const app_module_1 = require("./app.module");
const env_validation_1 = require("./config/env.validation");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
async function bootstrap() {
    (0, env_validation_1.validateProductionEnv)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bufferLogs: true,
    });
    const config = app.get(config_1.ConfigService);
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
        app.set('trust proxy', 1);
    }
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    }));
    app.use((0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 500,
        message: { msg: 'Too many requests, please try again later.' },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => req.path === '/health',
    }));
    const allowedOrigins = config.get('app.allowedOrigins') || [];
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }
            if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
                return callback(null, true);
            }
            console.warn(`CORS blocked request from origin: ${origin}`);
            return callback(new Error('Not allowed by CORS'), false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.use((0, morgan_1.default)('dev'));
    app.use((0, cookie_parser_1.default)());
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'uploads'), { prefix: '/uploads' });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
        exceptionFactory: (errors) => new common_1.BadRequestException({
            errors: errors.map((error) => ({
                type: 'field',
                msg: Object.values(error.constraints || {})[0] || 'Invalid value',
                path: error.property,
                location: 'body',
            })),
        }),
    }));
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
    const port = Number(process.env.PORT) || 3000;
    await app.listen(port);
    console.log(`LDS API (NestJS + Prisma) listening on port ${port}`);
}
bootstrap().catch((err) => {
    console.error('FATAL: failed to start server', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map