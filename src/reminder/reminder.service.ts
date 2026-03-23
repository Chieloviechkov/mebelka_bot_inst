import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramService } from '../instagram/instagram.service';
import { LeadStatus } from '@prisma/client';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly instagramService: InstagramService,
  ) {}

  private async isAiEnabled(): Promise<boolean> {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'AI_ENABLED' } });
    return setting?.value === 'true';
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Starting 24h follow-up check...');

    const aiEnabled = await this.isAiEnabled();
    if (!aiEnabled) {
      this.logger.log('AI is disabled — skipping reminders.');
      return;
    }

    try {
      const pendingReminders = await this.prisma.reminder.findMany({
        where: { status: 'pending', time: { lte: new Date() } },
        include: { lead: true },
      });

      for (const reminder of pendingReminders) {
        // Skip already qualified leads
        if (reminder.lead.status === LeadStatus.Perspektive ||
            reminder.lead.status === LeadStatus.LowPotential ||
            reminder.lead.status === LeadStatus.Zakryto ||
            reminder.lead.status === LeadStatus.Vidhyleno) {
          continue;
        }

        const sent = await this.instagramService.sendMessage(
          reminder.lead.instagram_id,
          'Добрий день! Ви ще тут? Ми готові відповісти на всі ваші питання щодо меблів! 🪑',
        );

        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: sent ? 'sent' : 'failed' },
        });

        if (sent) {
          this.logger.log(`Follow up sent to lead ${reminder.lead.id}`);
        }
      }
    } catch (error) {
      this.logger.error('Error in reminder cron', error);
    }
  }
}
