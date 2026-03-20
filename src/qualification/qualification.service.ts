import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiStatus } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class QualificationService {
  private readonly logger = new Logger(QualificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService
  ) {}

  async updateLeadParametersAndQualify(leadId: number, params: any) {
    try {
      this.logger.log(`Received extracted parameters for lead ${leadId}: ${JSON.stringify(params)}`);

      // We only update non-empty fields provided by OpenAI function calling
      const updateData: any = {};
      
      const paramKeys = ['type', 'dimensions', 'style', 'materials', 'budget', 'timeline', 'wishes'];
      for (const key of paramKeys) {
        if (params[key] && typeof params[key] === 'string' && params[key].trim().length > 0) {
          updateData[key] = params[key].trim();
        }
      }

      if (Object.keys(updateData).length === 0) {
        return; // nothing useful extracted yet
      }

      // 1. Update Lead properties
      const currentLead = await this.prisma.lead.update({
        where: { id: leadId },
        data: updateData
      });

      // 2. Perform Qualification Logic
      let newAiStatus: AiStatus = 'NeedsClarification';

      const hasBudget = !!currentLead.budget;
      const hasTimeline = !!currentLead.timeline;
      const hasType = !!currentLead.type;

      if (hasBudget && hasTimeline && hasType) {
        const budgetStr = currentLead.budget?.toLowerCase() || '';
        if (budgetStr.includes('мало') || budgetStr.includes('безкоштовно')) {
          newAiStatus = 'LowPotential';
        } else {
          newAiStatus = 'Perspektive';
        }
      } else {
        newAiStatus = 'NeedsClarification';
      }

      if (currentLead.ai_status !== newAiStatus) {
        await this.prisma.lead.update({
          where: { id: leadId },
          data: { ai_status: newAiStatus }
        });

        const reason = `Статус змінено на ${newAiStatus} на основі даних: budget=${!!hasBudget}, timeline=${!!hasTimeline}, type=${!!hasType}`;
        await this.prisma.history.create({
          data: {
            action: reason,
            lead_id: leadId
          }
        });

        this.logger.log(`Lead ${leadId} status set to ${newAiStatus}`);

        // Notify manager if fully qualified
        if (newAiStatus === 'Perspektive' || newAiStatus === 'LowPotential') {
          await this.notificationService.notifyManagersAboutLead(leadId);
        }
      }
    } catch (error) {
      this.logger.error(`Error qualifying lead ${leadId}:`, error);
    }
  }
}
