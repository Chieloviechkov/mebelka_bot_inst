import { PrismaService } from '../prisma/prisma.service';
export declare class ReminderService {
    private readonly prisma;
    private readonly logger;
    private readonly pageAccessToken;
    constructor(prisma: PrismaService);
    handleCron(): Promise<void>;
    private sendFollowUp;
}
