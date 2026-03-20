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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AiAssistantService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAssistantService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = __importDefault(require("openai"));
const prisma_service_1 = require("../prisma/prisma.service");
const qualification_service_1 = require("../qualification/qualification.service");
let AiAssistantService = AiAssistantService_1 = class AiAssistantService {
    prisma;
    qualificationService;
    logger = new common_1.Logger(AiAssistantService_1.name);
    openai;
    SYSTEM_PROMPT = `Ти — асистент з підбору меблів. Твоє завдання — ввічливо зібрати параметри замовлення (тип: стіл або шафа, розміри, стиль, матеріали, бюджет, терміни та побажання). 
Задавай питання по одному. Не будь нав'язливим. Коли збереш достатньо даних, обов'язково повідом про це користувача.
Твоя мета - допомогти клієнту визначитися з вибором та передати його запит менеджеру.`;
    constructor(prisma, qualificationService) {
        this.prisma = prisma;
        this.qualificationService = qualificationService;
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY || 'dummy_string',
        });
    }
    async processUserMessage(leadId, userText) {
        try {
            await this.prisma.message.create({
                data: {
                    text: userText,
                    sender_id: 'user',
                    role: 'user',
                    lead_id: leadId,
                },
            });
            const messages = await this.prisma.message.findMany({
                where: { lead_id: leadId },
                orderBy: { timestamp: 'desc' },
                take: 15,
            });
            const conversationHistory = messages.reverse().map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.text,
            }));
            const openAiMessages = [
                { role: 'system', content: this.SYSTEM_PROMPT },
                ...conversationHistory,
            ];
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: openAiMessages,
                tools: [
                    {
                        type: 'function',
                        function: {
                            name: 'extractOrderParams',
                            description: 'Витягує зафіксовані параметри замовлення з діалогу, коли вони з\'являються',
                            parameters: {
                                type: 'object',
                                properties: {
                                    type: { type: 'string', description: 'Тип меблів (стіл, шафа тощо)' },
                                    dimensions: { type: 'string', description: 'Розміри' },
                                    style: { type: 'string', description: 'Стиль меблів' },
                                    materials: { type: 'string', description: 'Бажані матеріали' },
                                    budget: { type: 'string', description: 'Очікуваний бюджет' },
                                    timeline: { type: 'string', description: 'Бажані терміни' },
                                    wishes: { type: 'string', description: 'Додаткові побажання' },
                                },
                            },
                        },
                    },
                ],
            });
            const responseMessage = completion.choices[0].message;
            if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                for (const toolCall of responseMessage.tool_calls) {
                    if (toolCall.type === 'function' && toolCall.function.name === 'extractOrderParams') {
                        const params = JSON.parse(toolCall.function.arguments);
                        await this.qualificationService.updateLeadParametersAndQualify(leadId, params);
                    }
                }
            }
            const botReply = responseMessage.content || 'Зачекайте хвилинку, ми обробляємо ваш запит...';
            await this.prisma.message.create({
                data: {
                    text: botReply,
                    sender_id: 'bot',
                    role: 'bot',
                    lead_id: leadId,
                },
            });
            return botReply;
        }
        catch (error) {
            this.logger.error('Error in AiAssistantService:', error);
            return 'Вибачте, виникла помилка під час обробки вашого запиту. Спробуйте пізніше.';
        }
    }
};
exports.AiAssistantService = AiAssistantService;
exports.AiAssistantService = AiAssistantService = AiAssistantService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        qualification_service_1.QualificationService])
], AiAssistantService);
//# sourceMappingURL=ai-assistant.service.js.map