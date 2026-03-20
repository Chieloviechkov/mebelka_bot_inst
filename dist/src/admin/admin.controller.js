"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AdminController = class AdminController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getLeads(pageRaw = '1', limitRaw = '10') {
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
    async updateStatus(id, newStatus) {
        try {
            const updated = await this.prisma.lead.update({
                where: { id },
                data: { ai_status: newStatus }
            });
            return updated;
        }
        catch (e) {
            throw new common_1.InternalServerErrorException('Помилка оновлення статусу');
        }
    }
    async addNote(id, text) {
        return this.prisma.note.create({
            data: {
                text,
                lead_id: id
            }
        });
    }
    async getAnalytics() {
        const totalLeads = await this.prisma.lead.count();
        const byStatus = await this.prisma.lead.groupBy({
            by: ['ai_status'],
            _count: true
        });
        const statusMap = byStatus.reduce((acc, curr) => {
            acc[curr.ai_status || 'Unqualified'] = curr._count;
            return acc;
        }, {});
        return { totalLeads, conversionByStatus: statusMap };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('leads'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getLeads", null);
__decorate([
    (0, common_1.Patch)('leads/:id/status'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)('leads/:id/note'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('text')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "addNote", null);
__decorate([
    (0, common_1.Get)('analytics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAnalytics", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map