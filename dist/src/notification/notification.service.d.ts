import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationService {
    private readonly prisma;
    private bot;
    private readonly logger;
    constructor(prisma: PrismaService);
    notifyManagersAboutLead(leadId: number): Promise<void>;
}
