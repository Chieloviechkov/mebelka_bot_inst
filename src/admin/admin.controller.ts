import { Controller, Get, Patch, Body, Param, Query, ParseIntPipe, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiStatus } from '@prisma/client';

@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('leads')
  async getLeads(@Query('page') pageRaw: string = '1', @Query('limit') limitRaw: string = '10') {
    const page = parseInt(pageRaw) || 1;
    const limit = parseInt(limitRaw) || 10;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.lead.findMany({
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { notes: true, _count: { select: { messages: true } } }
      })
    ]);

    return { total, page, limit, totalPages: Math.ceil(total / limit), data };
  }

  @Patch('leads/:id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') newStatus: AiStatus
  ) {
    try {
      const updated = await this.prisma.lead.update({
        where: { id },
        data: { ai_status: newStatus }
      });
      return updated;
    } catch (e) {
      throw new InternalServerErrorException('Помилка оновлення статусу');
    }
  }

  @Patch('leads/:id/note')
  async addNote(
    @Param('id', ParseIntPipe) id: number,
    @Body('text') text: string
  ) {
    return this.prisma.note.create({
      data: {
        text,
        lead_id: id
      }
    });
  }

  @Get('analytics')
  async getAnalytics() {
    const totalLeads = await this.prisma.lead.count();
    
    // Convert status to counts
    const byStatus = await this.prisma.lead.groupBy({
      by: ['ai_status'],
      _count: true
    });

    const statusMap = byStatus.reduce((acc, curr) => {
      acc[curr.ai_status || 'Unqualified'] = curr._count;
      return acc;
    }, {} as Record<string, number>);

    return { totalLeads, conversionByStatus: statusMap };
  }
}
