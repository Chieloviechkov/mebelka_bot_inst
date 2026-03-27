import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AiAssistantService } from '../ai-assistant/ai-assistant.service.js';
import { NotificationService } from '../notification/notification.service.js';
import { ChatGateway } from '../chat/chat.gateway.js';
import { FunnelStage } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly proxyApiSecret = process.env.PROXY_API_SECRET || '';
  private readonly proxyInstagramSendUrl = 'https://rubikon-backend-app-7d88586fd749.herokuapp.com/proxy/mebelka/instagram/send';

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiAssistant: AiAssistantService,
    private readonly notification: NotificationService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async processWebhook(body: any) {
    try {
      if (!body.entry?.length) return;

      for (const entry of body.entry) {
        if (!entry.messaging?.length) continue;

        for (const event of entry.messaging) {
          const senderId = event.sender.id;
          if (event.message?.is_echo) continue;

          const text = event.message?.text || event.postback?.title || null;
          const senderProfile = event._senderProfile;

          // Handle attachments
          const attachments = event.message?.attachments;
          let attachmentUrl: string | null = null;
          let attachmentType: string | null = null;
          if (attachments?.length) {
            attachmentUrl = attachments[0].payload?.url || null;
            attachmentType = attachments[0].type || null;
          }

          if (!text && !attachmentUrl) continue;

          this.logger.log(`Received message from [${senderId}] ${senderProfile?.username || ''}: ${text || '[attachment]'}`);

          // Ensure lead exists
          let lead = await this.prisma.lead.findUnique({ where: { instagram_id: senderId } });
          const isNewLead = !lead;

          if (!lead) {
            lead = await this.prisma.lead.create({
              data: {
                instagram_id: senderId,
                instagram_name: senderProfile?.name || null,
                instagram_username: senderProfile?.username || null,
              }
            });
            // Track funnel: new lead = Zayavka
            await this.prisma.history.create({
              data: { lead_id: lead.id, action: 'Лід створено', funnel_stage: FunnelStage.Zayavka }
            });
            this.logger.log(`Створено новий лід ${lead.id} для instagram_id ${senderId}`);

            // Notify supermanagers about new lead
            this.notification.notifyNewLead(lead.id).catch((err) =>
              this.logger.error('Помилка сповіщення про новий лід', err),
            );
          } else if (senderProfile) {
            const updates: any = {};
            if (senderProfile.username && senderProfile.username !== lead.instagram_username) {
              updates.instagram_username = senderProfile.username;
            }
            if (senderProfile.name && senderProfile.name !== lead.instagram_name) {
              updates.instagram_name = senderProfile.name;
            }
            if (Object.keys(updates).length > 0) {
              lead = await this.prisma.lead.update({ where: { id: lead.id }, data: updates });
            }
          }

          // Reset pending reminders when user replies
          await this.prisma.reminder.updateMany({
            where: { lead_id: lead.id, status: 'pending' },
            data: { status: 'cancelled' }
          });

          // Save message and touch lead's updatedAt so it sorts to the top
          const savedMessage = await this.prisma.message.create({
            data: {
              text,
              sender_id: senderId,
              role: 'user',
              lead_id: lead.id,
              attachment_url: attachmentUrl,
              attachment_type: attachmentType,
            }
          });
          await this.prisma.lead.update({
            where: { id: lead.id },
            data: { updatedAt: new Date() },
          });

          // Emit via WebSocket
          this.chatGateway.emitNewMessage(lead.id, savedMessage);
          if (isNewLead) {
            this.chatGateway.emitLeadUpdate(lead.id, { type: 'newLead' });
          }

          // Notify assigned managers about new message
          if (!isNewLead) {
            const clientName = lead.instagram_name || lead.instagram_username || lead.instagram_id;
            this.notification.notifyNewMessage(lead.id, clientName, text || '[вкладення]').catch((err) =>
              this.logger.error('Помилка сповіщення про повідомлення', err),
            );
          }

          this.logger.log(`Message saved for lead ${lead.id}`);

          // Check if AI is enabled
          const aiSetting = await this.prisma.setting.findUnique({ where: { key: 'AI_ENABLED' } });
          const aiEnabled = aiSetting?.value === 'true';

          if (aiEnabled) {
            // processUserMessage returns null if AI decides not to respond (manager active, lead closed, etc.)
            const botReply = await this.aiAssistant.processUserMessage(lead.id, text || '', attachmentUrl ? '[Клієнт надіслав фото]' : undefined);
            if (botReply) {
              await this.sendMessage(senderId, botReply);

              // Create 23h reminder only after successful AI response
              const reminderTime = new Date();
              reminderTime.setHours(reminderTime.getHours() + 23);
              await this.prisma.reminder.create({
                data: { lead_id: lead.id, time: reminderTime, status: 'pending' }
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Помилка при обробці webhook:', error);
    }
  }

  async sendAttachment(
    recipientId: string,
    fileUrl: string,
    type: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      // Try sending as attachment via Rubikon proxy
      const response = await axios.post(
        this.proxyInstagramSendUrl,
        {
          recipientId,
          attachment: { type, payload: { url: fileUrl } },
        },
        {
          headers: {
            Authorization: `Bearer ${this.proxyApiSecret}`,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`Sent attachment to ${recipientId} via proxy, messageId: ${response.data?.messageId}`);
      return { ok: true };
    } catch (error: any) {
      const rawMsg = error.response?.data?.message || error.message || '';
      const statusCode = error.response?.status;
      this.logger.warn(`Attachment send to ${recipientId} failed [${statusCode}]: ${rawMsg}`);

      // Fallback: send the URL as plain text
      this.logger.log(`Falling back to sending attachment URL as text to ${recipientId}`);
      const fallback = await this.sendMessage(recipientId, fileUrl);
      if (fallback.ok) {
        return { ok: true };
      }

      if (rawMsg.includes('outside of allowed window') || (statusCode === 500 && rawMsg === 'Internal server error')) {
        return { ok: false, error: 'Вікно 24 год. вичерпано — клієнт має написати першим' };
      }
      return { ok: false, error: rawMsg || 'Помилка відправки вкладення через Instagram' };
    }
  }

  async sendMessage(recipientId: string, text: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await axios.post(
        this.proxyInstagramSendUrl,
        { recipientId, text },
        { headers: { Authorization: `Bearer ${this.proxyApiSecret}`, 'Content-Type': 'application/json' } },
      );
      this.logger.log(`Sent message to ${recipientId} via proxy, messageId: ${response.data?.messageId}`);
      return { ok: true };
    } catch (error: any) {
      const rawMsg = error.response?.data?.message || error.message || '';
      const statusCode = error.response?.status;
      this.logger.warn(`Send to ${recipientId} failed [${statusCode}]: ${rawMsg}`);

      // Meta's 24h messaging window is the most common failure
      if (rawMsg.includes('outside of allowed window') || (statusCode === 500 && rawMsg === 'Internal server error')) {
        return { ok: false, error: 'Вікно 24 год. вичерпано — клієнт має написати першим' };
      }
      return { ok: false, error: rawMsg || 'Помилка відправки через Instagram' };
    }
  }
}
