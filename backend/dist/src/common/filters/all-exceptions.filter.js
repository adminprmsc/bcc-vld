"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
let AllExceptionsFilter = class AllExceptionsFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const body = exception.getResponse();
            if (typeof body === 'object' && body !== null && 'msg' in body) {
                response.status(status).json(body);
                return;
            }
            if (typeof body === 'object' && body !== null && 'errors' in body) {
                response.status(status).json(body);
                return;
            }
            response.status(status).json({ msg: exception.message });
            return;
        }
        console.error('Server Error:', {
            message: exception instanceof Error ? exception.message : String(exception),
            stack: process.env.NODE_ENV === 'development' && exception instanceof Error ? exception.stack : undefined,
            path: request?.path,
            method: request?.method,
        });
        const message = process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : exception instanceof Error
                ? exception.message
                : 'Internal server error';
        response.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ msg: message });
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map