import { PrismaService } from '../prisma/prisma.service';
import { AiAssistantService } from '../ai-assistant/ai-assistant.service';
export declare class InstagramService {
    private readonly prisma;
    private readonly aiAssistant;
    private readonly logger;
    private readonly pageAccessToken;
    constructor(prisma: PrismaService, aiAssistant: AiAssistantService);
    processWebhook(body: any): Promise<void>;
    private sendMessage;
}
