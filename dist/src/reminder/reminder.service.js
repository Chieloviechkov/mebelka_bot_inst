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
var ReminderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReminderService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const axios_1 = __importDefault(require("axios"));
let ReminderService = ReminderService_1 = class ReminderService {
    prisma;
    logger = new common_1.Logger(ReminderService_1.name);
    pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN || 'test_token';
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleCron() {
        this.logger.log('Starting 24h follow-up check...');
        try {
            const pendingReminders = await this.prisma.reminder.findMany({
                where: {
                    status: 'pending',
                    time: {
                        lte: new Date()
                    }
                },
                include: { lead: true }
            });
            for (const reminder of pendingReminders) {
                if (reminder.lead.ai_status !== 'Perspektive' && reminder.lead.ai_status !== 'LowPotential') {
                    await this.sendFollowUp(reminder.lead.instagram_id);
                    await this.prisma.reminder.update({
                        where: { id: reminder.id },
                        data: { status: 'sent' }
                    });
                    this.logger.log(`Follow up sent to lead ${reminder.lead.id}`);
                }
            }
        }
        catch (error) {
            this.logger.error('Error in reminder cron', error);
        }
    }
    async sendFollowUp(recipientId) {
        try {
            const url = `https://graph.facebook.com/v20.0/me/messages?access_token=${this.pageAccessToken}`;
            const payload = {
                recipient: { id: recipientId },
                message: { text: "Добрий день! Ви ще тут? Ми готові відповісти на всі ваші питання щодо меблів!" }
            };
            await axios_1.default.post(url, payload);
        }
        catch (error) {
            this.logger.error(`Failed to send follow-up to ${recipientId}: ${error.message}`);
        }
    }
};
exports.ReminderService = ReminderService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReminderService.prototype, "handleCron", null);
exports.ReminderService = ReminderService = ReminderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReminderService);
//# sourceMappingURL=reminder.service.js.map