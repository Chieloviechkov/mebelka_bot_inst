import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Header, Res,
  ParseIntPipe, BadRequestException, InternalServerErrorException, UseGuards, Req,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramService } from '../instagram/instagram.service';
import { LeadStatus, FunnelStage, ManagerRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly instagramService: InstagramService,
  ) {}

  // ─── ME ────────────────────────────────────────────

  @Get('me')
  async getMe(@Req() req: any) {
    const user = req.user;
    const manager = await this.prisma.manager.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!manager) throw new BadRequestException('Менеджер не знайдений');
    return manager;
  }

  // ─── LEADS ──────────────────────────────────────────

  @Get('leads/export')
  async exportLeadsCsv(@Res() res: Response) {
    const leads = await this.prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });

    const columns = [
      'id', 'instagram_name', 'instagram_username', 'phone', 'location',
      'type', 'dimensions', 'style', 'materials', 'budget', 'timeline', 'status', 'createdAt',
    ];
    const escCsv = (v: any) => {
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = leads.map(l => columns.map(c => escCsv((l as any)[c])).join(','));
    const csv = [columns.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send('\uFEFF' + csv);
  }

  @Get('leads')
  async getLeads(
    @Query('page') pageRaw = '1',
    @Query('limit') limitRaw = '10',
    @Query('status') status?: string,
    @Query('manager_id') managerIdRaw?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('has_application') hasApplication?: string,
    @Query('q') q?: string,
    @Query('sort_field') sortField?: string,
    @Query('sort_order') sortOrder?: string,
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

    // Filter by manager if requested
    if (managerIdRaw) {
      where.leadManagers = { some: { manager_id: parseInt(managerIdRaw) } };
    }

    if (q) {
      where.OR = [
        { instagram_id: { contains: q, mode: 'insensitive' } },
        { instagram_name: { contains: q, mode: 'insensitive' } },
        { instagram_username: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = sortField
      ? { [sortField]: sortOrder === 'asc' ? 'asc' : 'desc' }
      : { updatedAt: 'desc' };

    const [total, data] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          leadManagers: { include: { manager: true } },
          _count: { select: { messages: true } },
        },
      }),
    ]);

    return { total, page, limit, totalPages: Math.ceil(total / limit), data };
  }

  @Get('leads/:id')
  async getLead(@Param('id', ParseIntPipe) id: number) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        reminders: true,
        history: { orderBy: { createdAt: 'desc' } },
        leadManagers: { include: { manager: true } },
        messages: { take: 200, orderBy: { timestamp: 'desc' } },
        _count: { select: { messages: true } },
      },
    });
    if (!lead) throw new BadRequestException('Лід не знайдено');
    return lead;
  }

  @Patch('leads/:id')
  async updateLead(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, any>,
  ) {
    const allowed = [
      'instagram_name', 'phone', 'location', 'has_project',
      'type', 'dimensions', 'style', 'materials',
      'budget', 'price_per_sqm', 'timeline', 'wishes',
    ];
    const data: any = {};
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (Object.keys(data).length === 0) throw new BadRequestException('Немає полів для оновлення');
    return this.prisma.lead.update({ where: { id }, data });
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

  // ─── NOTES ────────────────────────────────────────────

  @Get('leads/:id/notes')
  async getNotes(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.note.findMany({
      where: { lead_id: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('leads/:id/notes')
  async createNote(
    @Param('id', ParseIntPipe) id: number,
    @Body('text') text: string,
  ) {
    if (!text?.trim()) throw new BadRequestException('Текст нотатки обов\'язковий');
    return this.prisma.note.create({ data: { text, lead_id: id } });
  }

  @Delete('notes/:id')
  async deleteNote(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.note.delete({ where: { id } });
    return { ok: true };
  }

  // ─── REMINDERS ────────────────────────────────────────

  @Get('leads/:id/reminders')
  async getReminders(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.reminder.findMany({
      where: { lead_id: id },
      orderBy: { time: 'asc' },
    });
  }

  @Post('leads/:id/reminders')
  async createReminder(
    @Param('id', ParseIntPipe) id: number,
    @Body('time') time: string,
  ) {
    if (!time) throw new BadRequestException('Час нагадування обов\'язковий');
    return this.prisma.reminder.create({
      data: { time: new Date(time), lead_id: id },
    });
  }

  @Delete('reminders/:id')
  async deleteReminder(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.reminder.delete({ where: { id } });
    return { ok: true };
  }

  // ─── HISTORY ──────────────────────────────────────────

  @Get('leads/:id/history')
  async getHistory(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.history.findMany({
      where: { lead_id: id },
      orderBy: { createdAt: 'desc' },
    });
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
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body('text') text: string,
  ) {
    if (!text?.trim()) throw new BadRequestException('Текст повідомлення обов\'язковий');

    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new BadRequestException('Лід не знайдено');

    // Auto-assign manager on first message
    const user = req.user;
    const alreadyAssigned = await this.prisma.leadManager.findFirst({
      where: { lead_id: id, manager_id: user.id },
    });
    if (!alreadyAssigned) {
      await this.prisma.leadManager.create({
        data: { lead_id: id, manager_id: user.id },
      });
    }

    const result = await this.instagramService.sendMessage(lead.instagram_id, text);

    const message = await this.prisma.message.create({
      data: { text, sender_id: 'manager', role: 'manager', lead_id: id, delivered: result.ok, delivery_error: result.error || null },
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

  @Post('leads/:id/attachment')
  @UseInterceptors(FileInterceptor('file'))
  async sendAttachmentToClient(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body('url') url?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new BadRequestException('Лід не знайдено');

    // Auto-assign manager on first attachment
    const user = req.user;
    const alreadyAssigned = await this.prisma.leadManager.findFirst({
      where: { lead_id: id, manager_id: user.id },
    });
    if (!alreadyAssigned) {
      await this.prisma.leadManager.create({
        data: { lead_id: id, manager_id: user.id },
      });
    }

    let attachmentUrl: string;
    let attachmentType: string;

    if (file) {
      // Upload to Cloudinary
      const { v2: cloudinary } = await import('cloudinary');
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'desfxxut8',
        api_key: process.env.CLOUDINARY_API_KEY || '233841214681723',
        api_secret: process.env.CLOUDINARY_API_SECRET || 'iNwSE0m1fJ4-kW3EoOXzP3bFMfA',
      });
      const mimeType = file.mimetype || 'application/octet-stream';
      attachmentType = mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('video/') ? 'video' : 'file';
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'mebelka', resource_type: attachmentType === 'image' ? 'image' : attachmentType === 'video' ? 'video' : 'raw' },
          (err, result) => err ? reject(err) : resolve(result),
        );
        stream.end(file.buffer);
      });
      attachmentUrl = uploadResult.secure_url;
    } else if (url) {
      attachmentUrl = url;
      // Detect type from URL extension
      const lower = url.toLowerCase();
      if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/.test(lower)) {
        attachmentType = 'image';
      } else if (/\.(mp4|mov|avi|webm)(\?|$)/.test(lower)) {
        attachmentType = 'video';
      } else {
        attachmentType = 'file';
      }
    } else {
      throw new BadRequestException('Потрібен файл або URL');
    }

    // Send via Instagram (Cloudinary URLs work, direct URLs work)
    const result = await this.instagramService.sendAttachment(lead.instagram_id, attachmentUrl, attachmentType);

    const message = await this.prisma.message.create({
      data: {
        text: null,
        sender_id: 'manager',
        role: 'manager',
        lead_id: id,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        delivered: result.ok,
        delivery_error: result.error || null,
      },
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

  @Get('messages/search')
  async searchMessages(@Query('q') q: string) {
    if (!q || q.length < 2) return [];
    const messages = await this.prisma.message.findMany({
      where: { text: { contains: q, mode: 'insensitive' } },
      orderBy: { timestamp: 'desc' },
      take: 50,
      include: { lead: { select: { id: true, instagram_name: true, instagram_username: true } } },
    });
    return messages;
  }

  @Post('messages/:id/retry')
  async retryMessage(@Param('id', ParseIntPipe) id: number) {
    const message = await this.prisma.message.findUnique({ where: { id }, include: { lead: true } });
    if (!message) throw new BadRequestException('Повідомлення не знайдено');
    if (message.delivered) return message;

    const result = await this.instagramService.sendMessage(message.lead.instagram_id, message.text || '');
    return this.prisma.message.update({ where: { id }, data: { delivered: result.ok, delivery_error: result.ok ? null : result.error } });
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

  @Post('managers')
  @Roles('supermanager')
  @UseGuards(RolesGuard)
  async createManager(
    @Body() body: { name: string; email: string; password: string; role?: string },
  ) {
    if (!body.email || !body.password || !body.name) {
      throw new BadRequestException('Ім\'я, email та пароль обов\'язкові');
    }
    const existing = await this.prisma.manager.findFirst({ where: { email: body.email } });
    if (existing) throw new BadRequestException('Email вже зайнятий');

    const bcrypt = await import('bcrypt');
    const password_hash = await bcrypt.hash(body.password, 10);
    return this.prisma.manager.create({
      data: {
        name: body.name,
        email: body.email,
        password_hash,
        telegram_id: `web_${Date.now()}`,
        role: (body.role as ManagerRole) || 'manager',
      },
    });
  }

  @Patch('managers/:id/role')
  @Roles('supermanager')
  @UseGuards(RolesGuard)
  async updateManagerRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: ManagerRole,
  ) {
    return this.prisma.manager.update({ where: { id }, data: { role } });
  }

  @Delete('managers/:id')
  @Roles('supermanager')
  @UseGuards(RolesGuard)
  async deleteManager(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.leadManager.deleteMany({ where: { manager_id: id } });
    await this.prisma.manager.delete({ where: { id } });
    return { ok: true };
  }

  // ─── STATUS LABELS (public for all authenticated users) ─────────

  @Get('status-labels')
  async getStatusLabels() {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'STATUS_LABELS' } });
    try {
      return JSON.parse(setting?.value || '{}');
    } catch {
      return {};
    }
  }

  // ─── SETTINGS ───────────────────────────────────────

  @Get('settings')
  @Roles('supermanager')
  @UseGuards(RolesGuard)
  async getSettings() {
    const settings = await this.prisma.setting.findMany();
    const defaults: Record<string, string> = {
      MIN_BUDGET_UAH: '5000',
      MIN_PRICE_PER_SQM: '2000',
      MAX_PRICE_PER_SQM: '50000',
      MIN_TIMELINE_DAYS: '7',
      AI_ENABLED: 'false',
      COMPANY_ADDRESSES: '[{"name":"Правий берег","address":"ТЦ \\"Будинок Меблів\\" бульвар Миколи Міхновського, 23","map":"https://maps.app.goo.gl/xZaRPfUSqtc8gDHk6"},{"name":"Лівий берег","address":"ТЦ \\"Ваш Дім\\" вулиця Катерини Гандзюк, 2","map":"https://maps.app.goo.gl/bmX8wx9WZxubZFve8"},{"name":"Офіс","address":"Харківське шоссе 201/203","map":"https://maps.app.goo.gl/6SwyvAQgmQ6HZ2iV8"}]',
      AI_SYSTEM_PROMPT: '',
      STATUS_LABELS: '{}',
    };
    const result: Record<string, string> = { ...defaults };
    for (const s of settings) result[s.key] = s.value;
    return result;
  }

  @Patch('settings')
  @Roles('supermanager')
  @UseGuards(RolesGuard)
  async updateSettings(@Body() body: Record<string, string>) {
    const allowed = [
      'MIN_BUDGET_UAH', 'MIN_PRICE_PER_SQM', 'MAX_PRICE_PER_SQM',
      'MIN_TIMELINE_DAYS', 'AI_ENABLED', 'COMPANY_ADDRESSES', 'AI_SYSTEM_PROMPT',
      'STATUS_LABELS',
    ];
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
