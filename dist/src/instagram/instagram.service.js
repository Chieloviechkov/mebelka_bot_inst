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
var InstagramService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const ai_assistant_service_1 = require("../ai-assistant/ai-assistant.service");
const axios_1 = __importDefault(require("axios"));
let InstagramService = InstagramService_1 = class InstagramService {
    prisma;
    aiAssistant;
    logger = new common_1.Logger(InstagramService_1.name);
    pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN || 'your_page_access_token';
    constructor(prisma, aiAssistant) {
        this.prisma = prisma;
        this.aiAssistant = aiAssistant;
    }
    async processWebhook(body) {
        try {
            if (body.entry && body.entry.length > 0) {
                for (const entry of body.entry) {
                    if (entry.messaging && entry.messaging.length > 0) {
                        for (const event of entry.messaging) {
                            const senderId = event.sender.id;
                            if (event.message?.is_echo)
                                continue;
                            const text = event.message?.text || event.postback?.title;
                            if (!text)
                                continue;
                            this.logger.log(`Received message from [${senderId}]: ${text}`);
                            let lead = await this.prisma.lead.findUnique({
                                where: { instagram_id: senderId }
                            });
                            if (!lead) {
                                lead = await this.prisma.lead.create({
                                    data: {
                                        instagram_id: senderId
                                    }
                                });
                                this.logger.log(`Створено новий лід ${lead.id} для instagram_id ${senderId}`);
                            }
                            await this.prisma.reminder.updateMany({
                                where: { lead_id: lead.id, status: 'pending' },
                                data: { status: 'cancelled' }
                            });
                            const botReply = await this.aiAssistant.processUserMessage(lead.id, text);
                            await this.sendMessage(senderId, botReply);
                            const reminderTime = new Date();
                            reminderTime.setHours(reminderTime.getHours() + 24);
                            await this.prisma.reminder.create({
                                data: {
                                    lead_id: lead.id,
                                    time: reminderTime,
                                    status: 'pending'
                                }
                            });
                        }
                    }
                }
            }
        }
        catch (error) {
            this.logger.error('Помилка при обробці webhook:', error);
        }
    }
    async sendMessage(recipientId, text) {
        try {
            const url = `https://graph.facebook.com/v20.0/me/messages?access_token=${this.pageAccessToken}`;
            const payload = {
                recipient: { id: recipientId },
                message: { text: text }
            };
            await axios_1.default.post(url, payload);
            this.logger.log(`Sent message to ${recipientId}:\n${text}`);
        }
        catch (error) {
            this.logger.error(`Error sending message to ${recipientId}: ${JSON.stringify(error.response?.data || error.message)}`);
        }
    }
};
exports.InstagramService = InstagramService;
exports.InstagramService = InstagramService = InstagramService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_assistant_service_1.AiAssistantService])
], InstagramService);
//# sourceMappingURL=instagram.service.js.map