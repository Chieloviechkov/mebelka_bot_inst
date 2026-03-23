import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service.js';

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

    // /start — link Telegram account to manager
    this.bot.start(async (ctx) => {
      const telegramId = ctx.from.id.toString();
      const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');

      try {
        const existing = await this.prisma.manager.findUnique({ where: { telegram_id: telegramId } });
        if (!existing) {
          await this.prisma.manager.create({
            data: { telegram_id: telegramId, name, notifications_enabled: true },
          });
          await ctx.reply(`Вас зареєстровано як менеджера: ${name}. Ви будете отримувати сповіщення про нових лідів.`);
          this.logger.log(`Зареєстровано менеджера: ${name} (${telegramId})`);
        } else {
          // Update chat id in case it changed, ensure notifications enabled
          if (!existing.name) {
            await this.prisma.manager.update({
              where: { id: existing.id },
              data: { name },
            });
          }
          await ctx.reply(`Ви вже зареєстровані як менеджер. Ви отримуєте сповіщення про нових лідів.`);
        }
      } catch (error) {
        this.logger.error('Помилка при обробці /start', error);
        await ctx.reply('Виникла помилка. Спробуйте пізніше.');
      }
    });

    // /leads — show assigned leads (or all for supermanagers)
    this.bot.command('leads', async (ctx) => {
      const telegramId = ctx.from.id.toString();

      try {
        const manager = await this.prisma.manager.findUnique({ where: { telegram_id: telegramId } });
        if (!manager) {
          await ctx.reply('Вас не зареєстровано як менеджера. Надішліть /start для реєстрації.');
          return;
        }

        let leads: any[];
        if (manager.role === 'supermanager') {
          leads = await this.prisma.lead.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
          });
        } else {
          const leadManagers = await this.prisma.leadManager.findMany({
            where: { manager_id: manager.id },
            include: { lead: true },
            orderBy: { assignedAt: 'desc' },
            take: 20,
          });
          leads = leadManagers.map((lm) => lm.lead);
        }

        if (leads.length === 0) {
          await ctx.reply('У вас немає призначених лідів.');
          return;
        }

        const statusLabels = this.getStatusLabels();
        const lines = leads.map((lead) => {
          const name = lead.instagram_name || lead.instagram_username || lead.instagram_id;
          const status = statusLabels[lead.status] || lead.status;
          return `#${lead.id} — ${name} — ${status}`;
        });

        const header = manager.role === 'supermanager' ? '📋 Останні 20 лідів:' : '📋 Ваші ліди:';
        await ctx.reply(`${header}\n\n${lines.join('\n')}`);
      } catch (error) {
        this.logger.error('Помилка при обробці /leads', error);
        await ctx.reply('Виникла помилка. Спробуйте пізніше.');
      }
    });

    // /lead [id] — show lead details
    this.bot.command('lead', async (ctx) => {
      const telegramId = ctx.from.id.toString();
      const args = ctx.message.text.split(' ').slice(1);
      const leadId = parseInt(args[0], 10);

      if (!leadId || isNaN(leadId)) {
        await ctx.reply('Використання: /lead [id]\nНаприклад: /lead 42');
        return;
      }

      try {
        const manager = await this.prisma.manager.findUnique({ where: { telegram_id: telegramId } });
        if (!manager) {
          await ctx.reply('Вас не зареєстровано як менеджера. Надішліть /start для реєстрації.');
          return;
        }

        const lead = await this.prisma.lead.findUnique({
          where: { id: leadId },
          include: {
            leadManagers: { include: { manager: true } },
            messages: { orderBy: { timestamp: 'desc' }, take: 5 },
          },
        });

        if (!lead) {
          await ctx.reply(`Лід #${leadId} не знайдено.`);
          return;
        }

        // Check access: supermanagers see all, managers only their leads
        if (manager.role !== 'supermanager') {
          const isAssigned = lead.leadManagers.some((lm) => lm.manager_id === manager.id);
          if (!isAssigned) {
            await ctx.reply('У вас немає доступу до цього ліда.');
            return;
          }
        }

        const statusLabels = this.getStatusLabels();
        const assignedNames = lead.leadManagers.map((lm) => lm.manager.name || `#${lm.manager.id}`).join(', ') || 'Не призначено';

        const lastMessages = lead.messages
          .reverse()
          .map((m) => {
            const role = m.role === 'user' ? '👤' : m.role === 'bot' ? '🤖' : '👨‍💼';
            const text = m.text ? (m.text.length > 80 ? m.text.substring(0, 80) + '...' : m.text) : '[вкладення]';
            return `${role} ${text}`;
          })
          .join('\n');

        const message =
          `📋 *Лід #${lead.id}*\n\n` +
          `📱 Instagram: ${lead.instagram_username ? '@' + lead.instagram_username : lead.instagram_id}\n` +
          `👤 Ім'я: ${lead.instagram_name || 'Не вказано'}\n` +
          `📞 Телефон: ${lead.phone || 'Не вказано'}\n` +
          `📍 Локація: ${lead.location || 'Не вказано'}\n` +
          `🛋 Тип: ${lead.type || 'Не вказано'}\n` +
          `📏 Розміри: ${lead.dimensions || 'Не вказано'}\n` +
          `🎨 Стиль: ${lead.style || 'Не вказано'}\n` +
          `🪵 Матеріали: ${lead.materials || 'Не вказано'}\n` +
          `💰 Бюджет: ${lead.budget || 'Не вказано'}\n` +
          `⏳ Терміни: ${lead.timeline || 'Не вказано'}\n` +
          `✨ Побажання: ${lead.wishes || 'Немає'}\n` +
          `🌟 Статус: ${statusLabels[lead.status] || lead.status}\n` +
          `👨‍💼 Менеджери: ${assignedNames}\n` +
          `📅 Створено: ${lead.createdAt.toLocaleDateString('uk-UA')}\n\n` +
          `💬 *Останні повідомлення:*\n${lastMessages || 'Немає повідомлень'}`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
      } catch (error) {
        this.logger.error('Помилка при обробці /lead', error);
        await ctx.reply('Виникла помилка. Спробуйте пізніше.');
      }
    });

    // /notifications on|off — toggle notifications
    this.bot.command('notifications', async (ctx) => {
      const telegramId = ctx.from.id.toString();
      const args = ctx.message.text.split(' ').slice(1);
      const action = args[0]?.toLowerCase();

      try {
        const manager = await this.prisma.manager.findUnique({ where: { telegram_id: telegramId } });
        if (!manager) {
          await ctx.reply('Вас не зареєстровано як менеджера. Надішліть /start для реєстрації.');
          return;
        }

        if (action === 'on') {
          await this.prisma.manager.update({ where: { id: manager.id }, data: { notifications_enabled: true } });
          await ctx.reply('🔔 Сповіщення увімкнено.');
        } else if (action === 'off') {
          await this.prisma.manager.update({ where: { id: manager.id }, data: { notifications_enabled: false } });
          await ctx.reply('🔕 Сповіщення вимкнено.');
        } else {
          const status = manager.notifications_enabled ? '🔔 увімкнені' : '🔕 вимкнені';
          await ctx.reply(`Сповіщення зараз ${status}.\n\nВикористання:\n/notifications on — увімкнути\n/notifications off — вимкнути`);
        }
      } catch (error) {
        this.logger.error('Помилка при обробці /notifications', error);
        await ctx.reply('Виникла помилка. Спробуйте пізніше.');
      }
    });

    this.bot.launch().catch((err) => this.logger.error('Помилка запуску Telegram бота', err));
    this.logger.log('Telegram бот запущено');
  }

  /**
   * Notify supermanagers when a new lead is created.
   */
  async notifyNewLead(leadId: number) {
    if (!this.bot) return;

    try {
      const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) return;

      const message =
        `🆕 *Новий лід створено!*\n\n` +
        `🆔 ID: ${lead.id}\n` +
        `📱 Instagram: ${lead.instagram_username ? '@' + lead.instagram_username : lead.instagram_id}\n` +
        `👤 Ім'я: ${lead.instagram_name || 'Не вказано'}\n` +
        `📅 ${new Date().toLocaleString('uk-UA')}`;

      // Notify all supermanagers with notifications enabled
      const supermanagers = await this.prisma.manager.findMany({
        where: { role: 'supermanager', notifications_enabled: true },
      });

      for (const mgr of supermanagers) {
        if (mgr.telegram_id) {
          try {
            await this.bot.telegram.sendMessage(mgr.telegram_id, message, { parse_mode: 'Markdown' });
          } catch (err) {
            this.logger.warn(`Не вдалося відправити сповіщення менеджеру ${mgr.id}: ${err}`);
          }
        }
      }

      this.logger.log(`Сповіщення про новий лід ${leadId} відправлено ${supermanagers.length} суперменеджерам`);
    } catch (error) {
      this.logger.error('Помилка при відправці сповіщення про новий лід', error);
    }
  }

  /**
   * Notify assigned managers when a client sends a message.
   */
  async notifyNewMessage(leadId: number, clientName: string, textPreview: string) {
    if (!this.bot) return;

    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        include: { leadManagers: { include: { manager: true } } },
      });
      if (!lead) return;

      const managers = lead.leadManagers
        .map((lm) => lm.manager)
        .filter((m) => m.notifications_enabled && m.telegram_id);

      if (managers.length === 0) return;

      const preview = textPreview
        ? textPreview.length > 100
          ? textPreview.substring(0, 100) + '...'
          : textPreview
        : '[вкладення]';

      const message = `💬 Нове повідомлення від ${clientName}:\n\n${preview}\n\n🆔 Лід #${lead.id}`;

      for (const mgr of managers) {
        try {
          await this.bot.telegram.sendMessage(mgr.telegram_id, message);
        } catch (err) {
          this.logger.warn(`Не вдалося відправити сповіщення менеджеру ${mgr.id}: ${err}`);
        }
      }

      this.logger.log(`Сповіщення про повідомлення для ліда ${leadId} відправлено ${managers.length} менеджерам`);
    } catch (error) {
      this.logger.error('Помилка при відправці сповіщення про повідомлення', error);
    }
  }

  /**
   * Notify managers about a qualified lead (existing functionality).
   */
  async notifyManagersAboutLead(leadId: number) {
    if (!this.bot) return;

    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        include: { leadManagers: { include: { manager: true } } },
      });
      if (!lead) return;

      const statusLabels = this.getStatusLabels();

      const message =
        `🔥 *Новий лід пройшов кваліфікацію!*\n\n` +
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
      let managers = lead.leadManagers
        .map((lm) => lm.manager)
        .filter((m) => m.notifications_enabled);
      if (managers.length === 0) {
        managers = await this.prisma.manager.findMany({ where: { notifications_enabled: true } });
      }

      for (const manager of managers) {
        if (manager.telegram_id) {
          try {
            await this.bot.telegram.sendMessage(manager.telegram_id, message, { parse_mode: 'Markdown' });
          } catch (err) {
            this.logger.warn(`Не вдалося відправити сповіщення менеджеру ${manager.id}: ${err}`);
          }
        }
      }
      this.logger.log(`Сповіщення про лід ${leadId} відправлено ${managers.length} менеджерам`);
    } catch (error) {
      this.logger.error('Помилка при відправці сповіщень', error);
    }
  }

  private getStatusLabels(): Record<string, string> {
    return {
      Novyi: '🆕 Новий',
      Perspektive: '🔥 Перспективний',
      NeedsClarification: '⏳ Потребує уточнення',
      LowPotential: '❄️ Низький потенціал',
      VRoboti: '🔧 В роботі',
      DomovlenoProZamir: '📐 Домовлено про замір',
      OchikuyePeredoplatu: '💳 Очікує передоплату',
      Zakryto: '✅ Закрито',
      Vidhyleno: '❌ Відхилено',
    };
  }
}
