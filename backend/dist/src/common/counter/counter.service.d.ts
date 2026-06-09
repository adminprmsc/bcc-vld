import { PrismaService } from '../../prisma/prisma.service';
export declare class CounterService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    nextSequence(counterKey: string): Promise<number>;
}
