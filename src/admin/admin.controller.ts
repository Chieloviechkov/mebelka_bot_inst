import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseIntPipe, BadRequestException, InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramService } from '../instagram/instagram.service';
import { LeadStatus, FunnelStage, ManagerRole } from '@prisma/client';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly instagramService: InstagramService,
  ) {}

  // ─── LEADS ──────────────────────────────────────────

  @Get('leads')
  async getLeads(
    @Query('page') pageRaw = '1',
    @Query('limit') limitRaw = '10',
    @Query('status') status?: string,
    @Query('manager_id') managerIdRaw?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('has_application') hasApplication?: string,
  ) {
    const page = parseInt(pageRaw) || 1;
    const limit = parseInt(limitRaw) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (hasApplication === 'true') where.has_application = true;
    if (hasApplication === 'false') where.has_application = false;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    if (managerIdRaw) {
      where.leadManagers = { some: { manager_id: parseInt(managerIdRaw) } };
    }

    const [total, data] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          notes: true,
          leadManagers: { include: { manager: true } },
          _count: { select: { messages: true } },
        },
      }),
    ]);

    return { total, page, limit, totalPages: Math.ceil(total / limit), data };
  }

  @Patch('leads/:id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') newStatus: LeadStatus,
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new BadRequestException('Лід не знайдено');

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { status: newStatus },
    });

    // Track history
    await this.prisma.history.create({
      data: {
        lead_id: id,
        action: `Статус змінено: ${lead.status} → ${newStatus}`,
        funnel_stage: newStatus === LeadStatus.Zakryto ? FunnelStage.Ugoda : undefined,
      },
    });

    return updated;
  }

  @Patch('leads/:id/note')
  async addNote(
    @Param('id', ParseIntPipe) id: number,
    @Body('text') text: string,
  ) {
    return this.prisma.note.create({ data: { text, lead_id: id } });
  }

  // ─── MESSAGES ───────────────────────────────────────

  @Get('leads/:id/messages')
  async getMessages(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') pageRaw = '1',
    @Query('limit') limitRaw = '50',
  ) {
    const page = parseInt(pageRaw) || 1;
    const limit = parseInt(limitRaw) || 50;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.message.count({ where: { lead_id: id } }),
      this.prisma.message.findMany({
        where: { lead_id: id },
        skip,
        take: limit,
        orderBy: { timestamp: 'asc' },
      }),
    ]);

    return { total, page, limit, totalPages: Math.ceil(total / limit), data };
  }

  @Post('leads/:id/message')
  async sendMessageToClient(
    @Param('id', ParseIntPipe) id: number,
    @Body('text') text: string,
  ) {
    if (!text?.trim()) throw new BadRequestException('Текст повідомлення обов\'язковий');

    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new BadRequestException('Лід не знайдено');

    await this.instagramService.sendMessage(lead.instagram_id, text);

    const message = await this.prisma.message.create({
      data: { text, sender_id: 'manager', role: 'manager', lead_id: id },
    });

    // Track funnel: first manager message = KontaktMenedzhera
    const hasManagerContact = await this.prisma.history.findFirst({
      where: { lead_id: id, funnel_stage: FunnelStage.KontaktMenedzhera },
    });
    if (!hasManagerContact) {
      await this.prisma.history.create({
        data: { lead_id: id, action: 'Менеджер вперше написав клієнту', funnel_stage: FunnelStage.KontaktMenedzhera },
      });
    }

    return message;
  }

  // ─── MANAGER ASSIGNMENT ─────────────────────────────

  @Post('leads/:id/assign')
  async assignManager(
    @Param('id', ParseIntPipe) id: number,
    @Body('manager_id', ParseIntPipe) managerId: number,
  ) {
    const count = await this.prisma.leadManager.count({ where: { lead_id: id } });
    if (count >= 4) throw new BadRequestException('Максимум 4 менеджери на лід');

    const assignment = await this.prisma.leadManager.create({
      data: { lead_id: id, manager_id: managerId },
    });

    // Track funnel
    const hasContact = await this.prisma.history.findFirst({
      where: { lead_id: id, funnel_stage: FunnelStage.KontaktMenedzhera },
    });
    if (!hasContact) {
      await this.prisma.history.create({
        data: { lead_id: id, action: 'Менеджера призначено', funnel_stage: FunnelStage.KontaktMenedzhera },
      });
    }

    return assignment;
  }

  @Delete('leads/:id/assign/:managerId')
  async unassignManager(
    @Param('id', ParseIntPipe) id: number,
    @Param('managerId', ParseIntPipe) managerId: number,
  ) {
    await this.prisma.leadManager.deleteMany({ where: { lead_id: id, manager_id: managerId } });
    return { ok: true };
  }

  @Get('leads/:id/managers')
  async getLeadManagers(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.leadManager.findMany({
      where: { lead_id: id },
      include: { manager: true },
    });
  }

  // ─── MANAGERS ───────────────────────────────────────

  @Get('managers')
  async getManagers() {
    return this.prisma.manager.findMany({
      include: { _count: { select: { leads: true } } },
    });
  }

  @Patch('managers/:id/role')
  async updateManagerRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: ManagerRole,
  ) {
    return this.prisma.manager.update({ where: { id }, data: { role } });
  }

  // ─── SETTINGS ───────────────────────────────────────

  @Get('settings')
  async getSettings() {
    const settings = await this.prisma.setting.findMany();
    const defaults: Record<string, string> = {
      MIN_BUDGET_UAH: '5000',
      MIN_PRICE_PER_SQM: '2000',
      MAX_PRICE_PER_SQM: '50000',
      MIN_TIMELINE_DAYS: '7',
      AI_ENABLED: 'false',
    };
    const result: Record<string, string> = { ...defaults };
    for (const s of settings) result[s.key] = s.value;
    return result;
  }

  @Patch('settings')
  async updateSettings(@Body() body: Record<string, string>) {
    const allowed = ['MIN_BUDGET_UAH', 'MIN_PRICE_PER_SQM', 'MAX_PRICE_PER_SQM', 'MIN_TIMELINE_DAYS', 'AI_ENABLED'];
    const updated: Record<string, string> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        await this.prisma.setting.upsert({
          where: { key },
          update: { value: body[key] },
          create: { key, value: body[key] },
        });
        updated[key] = body[key];
      }
    }
    return updated;
  }

  // ─── ANALYTICS ──────────────────────────────────────

  @Get('analytics')
  async getAnalytics() {
    const totalLeads = await this.prisma.lead.count();

    const byStatus = await this.prisma.lead.groupBy({ by: ['status'], _count: true });
    const statusMap = byStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>);

    // Funnel
    const zayavkaCount = totalLeads;
    const kontaktResult = await this.prisma.history.findMany({
      where: { funnel_stage: FunnelStage.KontaktMenedzhera },
      distinct: ['lead_id'],
    });
    const kontaktCount = kontaktResult.length;

    const ugodaResult = await this.prisma.history.findMany({
      where: { funnel_stage: FunnelStage.Ugoda },
      distinct: ['lead_id'],
    });
    const ugodaCount = ugodaResult.length;

    const qualifiedCount = (statusMap['Perspektive'] || 0);
    const qualifiedPercent = totalLeads > 0 ? ((qualifiedCount / totalLeads) * 100).toFixed(1) : '0';

    return {
      totalLeads,
      byStatus: statusMap,
      funnel: {
        zayavka: zayavkaCount,
        kontaktMenedzhera: kontaktCount,
        ugoda: ugodaCount,
      },
      conversionRates: {
        qualifiedPercent: `${qualifiedPercent}%`,
        zayavkaToKontakt: zayavkaCount > 0 ? `${((kontaktCount / zayavkaCount) * 100).toFixed(1)}%` : '0%',
        kontaktToUgoda: kontaktCount > 0 ? `${((ugodaCount / kontaktCount) * 100).toFixed(1)}%` : '0%',
        overallConversion: zayavkaCount > 0 ? `${((ugodaCount / zayavkaCount) * 100).toFixed(1)}%` : '0%',
      },
    };
  }
}
