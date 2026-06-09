"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CounterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let CounterService = class CounterService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async nextSequence(counterKey) {
        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.counters.findUnique({ where: { counter_key: counterKey } });
            if (!existing) {
                const created = await tx.counters.create({
                    data: { counter_key: counterKey, seq: BigInt(1) },
                });
                return Number(created.seq);
            }
            const next = Number(existing.seq) + 1;
            await tx.counters.update({
                where: { id: existing.id },
                data: { seq: BigInt(next) },
            });
            return next;
        });
    }
};
exports.CounterService = CounterService;
exports.CounterService = CounterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CounterService);
//# sourceMappingURL=counter.service.js.map