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
      this.logger.warn('TELEGRAM_BOT_TOKEN не встановлено');
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
        await ctx.reply(`Вас зареєстровано як менеджера: ${name}. Ви будете отримувати сповіщення про нових лідів.`);
        this.logger.log(`Зареєстровано менеджера: ${name} (${telegramId})`);
      } else {
        await ctx.reply(`Ви вже зареєстровані як менеджер. Ви отримуєте сповіщення про нових лідів.`);
      }
    });

    this.bot.launch().catch((err) => this.logger.error('Помилка запуску Telegram бота', err));
    this.logger.log('Telegram бот запущено');
  }

  async notifyManagersAboutLead(leadId: number) {
    if (!this.bot) return;

    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        include: { leadManagers: { include: { manager: true } } },
      });
      if (!lead) return;

      const statusLabels: Record<string, string> = {
        'Novyi': '🆕 Новий',
        'Perspektive': '🔥 Перспективний',
        'NeedsClarification': '⏳ Потребує уточнення',
        'LowPotential': '❄️ Низький потенціал',
        'VRoboti': '🔧 В роботі',
        'DomovlenoProZamir': '📐 Домовлено про замір',
        'OchikuyePeredoplatu': '💳 Очікує передоплату',
        'Zakryto': '✅ Закрито',
        'Vidhyleno': '❌ Відхилено',
      };

      const message = `🔥 *Новий лід пройшов кваліфікацію!*\n\n` +
        `🆔 ID: ${lead.id}\n` +
        `📱 Instagram: ${lead.instagram_username ? '@' + lead.instagram_username : lead.instagram_id}\n` +
        `👤 Ім'я: ${lead.instagram_name || 'Не вказано'}\n` +
        `🛋 Тип: ${lead.type || 'Не вказано'}\n` +
        `📏 Розміри: ${lead.dimensions || 'Не вказано'}\n` +
        `🎨 Стиль: ${lead.style || 'Не вказано'}\n` +
        `🪵 Матеріали: ${lead.materials || 'Не вказано'}\n` +
        `💰 Бюджет: ${lead.budget || 'Не вказано'}\n` +
        `⏳ Терміни: ${lead.timeline || 'Не вказано'}\n` +
        `✨ Побажання: ${lead.wishes || 'Немає'}\n` +
        `🌟 Статус: ${statusLabels[lead.status] || lead.status}`;

      // Prefer assigned managers, fallback to all
      let managers = lead.leadManagers.map(lm => lm.manager);
      if (managers.length === 0) {
        managers = await this.prisma.manager.findMany();
      }

      for (const manager of managers) {
        if (manager.telegram_id) {
          await this.bot.telegram.sendMessage(manager.telegram_id, message, { parse_mode: 'Markdown' });
        }
      }
      this.logger.log(`Сповіщення про лід ${leadId} відправлено ${managers.length} менеджерам`);
    } catch (error) {
      this.logger.error('Помилка при відправці сповіщень', error);
    }
  }
}
