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
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const telegraf_1 = require("telegraf");
const prisma_service_1 = require("../prisma/prisma.service");
let NotificationService = NotificationService_1 = class NotificationService {
    prisma;
    bot;
    logger = new common_1.Logger(NotificationService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (token) {
            this.bot = new telegraf_1.Telegraf(token);
        }
        else {
            this.logger.warn('TELEGRAM_BOT_TOKEN не встановлено, сповіщення Telegram не працюватимуть.');
        }
    }
    async notifyManagersAboutLead(leadId) {
        if (!this.bot)
            return;
        try {
            const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
            const managers = await this.prisma.manager.findMany();
            if (!lead)
                return;
            const statusLabels = {
                'Perspektive': '🔥 Перспективний',
                'NeedsClarification': '⏳ Потребує уточнення',
                'LowPotential': '❄️ Низький потенціал'
            };
            const message = `🔥 *Новий лід пройшов кваліфікацію!*\n\n` +
                `🆔 ID: ${lead.id}\n` +
                `📱 Instagram: ${lead.instagram_id}\n` +
                `🛋 Тип: ${lead.type || 'Не вказано'}\n` +
                `📏 Розміри: ${lead.dimensions || 'Не вказано'}\n` +
                `🎨 Стиль: ${lead.style || 'Не вказано'}\n` +
                `💰 Бюджет: ${lead.budget || 'Не вказано'}\n` +
                `⏳ Терміни: ${lead.timeline || 'Не вказано'}\n` +
                `🌟 Статус: ${lead.ai_status ? (statusLabels[lead.ai_status] || lead.ai_status) : 'Не кваліфіковано'}`;
            for (const manager of managers) {
                if (manager.telegram_id) {
                    await this.bot.telegram.sendMessage(manager.telegram_id, message, { parse_mode: 'Markdown' });
                }
            }
            this.logger.log(`Сповіщення про лід ${leadId} відправлено.`);
        }
        catch (error) {
            this.logger.error('Помилка при відправці сповіщень', error);
        }
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationService);
//# sourceMappingURL=notification.service.js.map