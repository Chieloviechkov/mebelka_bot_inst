import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiAssistantService } from '../ai-assistant/ai-assistant.service';
import axios from 'axios';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly proxyApiSecret = process.env.PROXY_API_SECRET || '';
  private readonly proxyInstagramSendUrl = 'https://rubikon-backend-app-7d88586fd749.herokuapp.com/proxy/instagram/send';

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiAssistant: AiAssistantService
  ) {}

  async processWebhook(body: any) {
    try {
      if (body.entry && body.entry.length > 0) {
        for (const entry of body.entry) {
          if (entry.messaging && entry.messaging.length > 0) {
            for (const event of entry.messaging) {
              const senderId = event.sender.id;
              // Ignore bot's own echo messages if subscribed to them
              if (event.message?.is_echo) continue;

              const text = event.message?.text || event.postback?.title;
              if (!text) continue; // Skip non-text events for now
              
              this.logger.log(`Received message from [${senderId}]: ${text}`);
              
              // Ensure lead exists
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

              // Reset any pending reminders when user replies
              await this.prisma.reminder.updateMany({
                where: { lead_id: lead.id, status: 'pending' },
                data: { status: 'cancelled' }
              });

              // Process text via AI Assistant
              const botReply = await this.aiAssistant.processUserMessage(lead.id, text);

              // Send message back via Instagram Graph API
              await this.sendMessage(senderId, botReply);

              // Create a reminder for 24 hours from now
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
    } catch (error) {
      this.logger.error('Помилка при обробці webhook:', error);
    }
  }

  async sendMessage(recipientId: string, text: string) {
    try {
      const response = await axios.post(
        this.proxyInstagramSendUrl,
        { recipientId, text },
        {
          headers: {
            Authorization: `Bearer ${this.proxyApiSecret}`,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`Sent message to ${recipientId} via proxy, messageId: ${response.data?.messageId}`);
    } catch (error: any) {
      this.logger.error(`Error sending message to ${recipientId}: ${JSON.stringify(error.response?.data || error.message)}`);
    }
  }
}
