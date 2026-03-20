import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);
  private readonly pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN || 'test_token';

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Starting 24h follow-up check...');
    
    // Find leads where the last message was from bot > 24 hours ago, and status is still NeedsClarification
    // For simplicity, we just find leads created > 24 hours ago that haven't finalized
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
          // Send follow up
          await this.sendFollowUp(reminder.lead.instagram_id);
          
          await this.prisma.reminder.update({
            where: { id: reminder.id },
            data: { status: 'sent' }
          });
          
          this.logger.log(`Follow up sent to lead ${reminder.lead.id}`);
        }
      }
    } catch (error) {
      this.logger.error('Error in reminder cron', error);
    }
  }

  private async sendFollowUp(recipientId: string) {
    try {
      const url = `https://graph.facebook.com/v20.0/me/messages?access_token=${this.pageAccessToken}`;
      const payload = {
        recipient: { id: recipientId },
        message: { text: "Добрий день! Ви ще тут? Ми готові відповісти на всі ваші питання щодо меблів!" }
      };

      await axios.post(url, payload);
    } catch (error: any) {
      this.logger.error(`Failed to send follow-up to ${recipientId}: ${error.message}`);
    }
  }
}
