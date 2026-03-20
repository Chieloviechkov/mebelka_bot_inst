import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService implements OnModuleInit {
  private bot: Telegraf;
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token) {
      this.bot = new Telegraf(token);
    } else {
      this.logger.warn('TELEGRAM_BOT_TOKEN не встановлено, сповіщення Telegram не працюватимуть.');
    }
  }

  async onModuleInit() {
    if (!this.bot) return;

    this.bot.start(async (ctx) => {
      const telegramId = ctx.from.id.toString();
      const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');

      const existing = await this.prisma.manager.findUnique({ where: { telegram_id: telegramId } });
      if (!existing) {
        await this.prisma.manager.create({ data: { telegram_id: telegramId, name } });
        await ctx.reply(`Вы зарегистрированы как менеджер: ${name}. Вы будете получать уведомления о новых лидах.`);
        this.logger.log(`Зарегистрирован менеджер: ${name} (${telegramId})`);
      } else {
        await ctx.reply(`Вы уже зарегистрированы как менеджер. Вы получаете уведомления о новых лидах.`);
      }
    });

    this.bot.launch().catch((err) => this.logger.error('Ошибка запуска Telegram бота', err));
    this.logger.log('Telegram бот запущен');
  }

  async notifyManagersAboutLead(leadId: number) {
    if (!this.bot) return;

    try {
      const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
      const managers = await this.prisma.manager.findMany();

      if (!lead) return;

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
    } catch (error) {
      this.logger.error('Помилка при відправці сповіщень', error);
    }
  }
}
