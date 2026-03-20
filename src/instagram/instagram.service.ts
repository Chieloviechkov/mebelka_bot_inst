import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiAssistantService } from '../ai-assistant/ai-assistant.service';
import axios from 'axios';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly proxyApiSecret = process.env.PROXY_API_SECRET || '';
  private readonly proxyInstagramSendUrl = 'https://rubikon-backend-app-7d88586fd749.herokuapp.com/proxy/mebelka/instagram/send';

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

              const senderProfile = event._senderProfile;

              this.logger.log(`Received message from [${senderId}] ${senderProfile?.username || ''}: ${text}`);

              // Ensure lead exists
              let lead = await this.prisma.lead.findUnique({
                where: { instagram_id: senderId }
              });

              if (!lead) {
                lead = await this.prisma.lead.create({
                  data: {
                    instagram_id: senderId,
                    instagram_name: senderProfile?.name || null,
                    instagram_username: senderProfile?.username || null,
                  }
                });
                this.logger.log(`Створено новий лід ${lead.id} для instagram_id ${senderId}`);
              } else if (senderProfile && (!lead.instagram_username || !lead.instagram_name)) {
                lead = await this.prisma.lead.update({
                  where: { id: lead.id },
                  data: {
                    instagram_name: senderProfile.name || lead.instagram_name,
                    instagram_username: senderProfile.username || lead.instagram_username,
                  }
                });
              }

              // Reset any pending reminders when user replies
              await this.prisma.reminder.updateMany({
                where: { lead_id: lead.id, status: 'pending' },
                data: { status: 'cancelled' }
              });

              // Process text via AI Assistant (disabled while OpenAI quota is empty)
              // const botReply = await this.aiAssistant.processUserMessage(lead.id, text);
              // await this.sendMessage(senderId, botReply);

              // Save message without AI processing
              await this.prisma.message.create({
                data: { text, sender_id: senderId, role: 'user', lead_id: lead.id }
              });
              this.logger.log(`Message saved for lead ${lead.id}`);

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
