import { PrismaService } from '../prisma/prisma.service';
import { QualificationService } from '../qualification/qualification.service';
export declare class AiAssistantService {
    private readonly prisma;
    private readonly qualificationService;
    private readonly logger;
    private openai;
    private readonly SYSTEM_PROMPT;
    constructor(prisma: PrismaService, qualificationService: QualificationService);
    processUserMessage(leadId: number, userText: string): Promise<string>;
}
