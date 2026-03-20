import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { LeadStatus } from '@prisma/client';

@Injectable()
export class QualificationService {
  private readonly logger = new Logger(QualificationService.name);

  private readonly MIN_BUDGET = parseInt(process.env.MIN_BUDGET_UAH || '5000');
  private readonly MIN_PRICE_PER_SQM = parseInt(process.env.MIN_PRICE_PER_SQM || '2000');
  private readonly MAX_PRICE_PER_SQM = parseInt(process.env.MAX_PRICE_PER_SQM || '50000');
  private readonly MIN_TIMELINE_DAYS = parseInt(process.env.MIN_TIMELINE_DAYS || '7');

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async updateLeadParametersAndQualify(leadId: number, params: any) {
    try {
      this.logger.log(`Extracted params for lead ${leadId}: ${JSON.stringify(params)}`);

      const updateData: any = {};
      const paramKeys = ['type', 'dimensions', 'style', 'materials', 'budget', 'price_per_sqm', 'timeline', 'wishes'];
      for (const key of paramKeys) {
        if (params[key] && typeof params[key] === 'string' && params[key].trim().length > 0) {
          updateData[key] = params[key].trim();
        }
      }

      if (Object.keys(updateData).length === 0) return;

      const lead = await this.prisma.lead.update({
        where: { id: leadId },
        data: updateData,
      });

      // Check completeness
      const hasType = !!lead.type;
      const hasBudget = !!lead.budget;
      const hasTimeline = !!lead.timeline;
      const hasApplication = hasType && hasBudget && hasTimeline;

      let newStatus: LeadStatus = LeadStatus.NeedsClarification;
      let reason = '';

      if (hasApplication) {
        const budgetNum = this.extractNumber(lead.budget || '');
        const pricePerSqm = this.extractNumber(lead.price_per_sqm || '');
        const timelineDays = this.estimateTimelineDays(lead.timeline || '');

        if (this.isSpam(lead.budget || '')) {
          newStatus = LeadStatus.LowPotential;
          reason = 'Підозра на спам';
        } else if (budgetNum > 0 && budgetNum < this.MIN_BUDGET) {
          newStatus = LeadStatus.LowPotential;
          reason = `Бюджет ${budgetNum} нижче мінімуму ${this.MIN_BUDGET}`;
        } else if (pricePerSqm > 0 && (pricePerSqm < this.MIN_PRICE_PER_SQM || pricePerSqm > this.MAX_PRICE_PER_SQM)) {
          newStatus = LeadStatus.LowPotential;
          reason = `Ціна за м² (${pricePerSqm}) поза діапазоном`;
        } else if (timelineDays > 0 && timelineDays < this.MIN_TIMELINE_DAYS) {
          newStatus = LeadStatus.LowPotential;
          reason = `Термін ${timelineDays} днів нереалістичний`;
        } else {
          newStatus = LeadStatus.Perspektive;
          reason = 'Усі параметри зібрані, бюджет адекватний';
        }
      } else {
        reason = `Не вистачає: ${[!hasType && 'тип', !hasBudget && 'бюджет', !hasTimeline && 'терміни'].filter(Boolean).join(', ')}`;
      }

      const previousStatus = lead.status;
      if (previousStatus !== newStatus) {
        await this.prisma.lead.update({
          where: { id: leadId },
          data: { status: newStatus, has_application: hasApplication },
        });

        await this.prisma.history.create({
          data: { lead_id: leadId, action: `Статус: ${previousStatus} → ${newStatus}. ${reason}` },
        });

        this.logger.log(`Lead ${leadId} qualified: ${newStatus} (${reason})`);

        if (newStatus === LeadStatus.Perspektive || newStatus === LeadStatus.LowPotential) {
          await this.notificationService.notifyManagersAboutLead(leadId);
        }
      }
    } catch (error) {
      this.logger.error(`Error qualifying lead ${leadId}:`, error);
    }
  }

  private extractNumber(str: string): number {
    const match = str.replace(/\s/g, '').match(/[\d]+/);
    return match ? parseInt(match[0]) : 0;
  }

  private estimateTimelineDays(timeline: string): number {
    const s = timeline.toLowerCase();
    if (/терміново|сьогодні|завтра/i.test(s)) return 2;
    if (/тиждень|7\s*дн/i.test(s)) return 7;
    if (/2\s*тижн/i.test(s)) return 14;
    if (/1\s*міс|місяц/i.test(s)) return 30;
    if (/2\s*міс/i.test(s)) return 60;
    if (/3\s*міс/i.test(s)) return 90;
    const dayMatch = s.match(/(\d+)\s*дн/);
    if (dayMatch) return parseInt(dayMatch[1]);
    return 0;
  }

  private isSpam(text: string): boolean {
    return /безкоштовно|бесплатно|халява|free|0\s*(грн|uah|\$|€)/i.test(text);
  }
}
