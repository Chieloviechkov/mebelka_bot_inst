import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramService } from '../instagram/instagram.service';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly instagramService: InstagramService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Starting 24h follow-up check...');

    try {
      const pendingReminders = await this.prisma.reminder.findMany({
        where: {
          status: 'pending',
          time: {
            lte: new Date(),
          },
        },
        include: { lead: true },
      });

      for (const reminder of pendingReminders) {
        if (reminder.lead.ai_status !== 'Perspektive' && reminder.lead.ai_status !== 'LowPotential') {
          await this.instagramService.sendMessage(
            reminder.lead.instagram_id,
            'Добрий день! Ви ще тут? Ми готові відповісти на всі ваші питання щодо меблів!',
          );

          await this.prisma.reminder.update({
            where: { id: reminder.id },
            data: { status: 'sent' },
          });

          this.logger.log(`Follow up sent to lead ${reminder.lead.id}`);
        }
      }
    } catch (error) {
      this.logger.error('Error in reminder cron', error);
    }
  }
}
