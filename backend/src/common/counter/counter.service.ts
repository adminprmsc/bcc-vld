import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CounterService {
  constructor(private readonly prisma: PrismaService) {}

  async nextSequence(counterKey: string): Promise<number> {
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
}
