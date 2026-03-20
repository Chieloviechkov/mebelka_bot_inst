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
var QualificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QualificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_service_1 = require("../notification/notification.service");
let QualificationService = QualificationService_1 = class QualificationService {
    prisma;
    notificationService;
    logger = new common_1.Logger(QualificationService_1.name);
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async updateLeadParametersAndQualify(leadId, params) {
        try {
            this.logger.log(`Received extracted parameters for lead ${leadId}: ${JSON.stringify(params)}`);
            const updateData = {};
            const paramKeys = ['type', 'dimensions', 'style', 'materials', 'budget', 'timeline', 'wishes'];
            for (const key of paramKeys) {
                if (params[key] && typeof params[key] === 'string' && params[key].trim().length > 0) {
                    updateData[key] = params[key].trim();
                }
            }
            if (Object.keys(updateData).length === 0) {
                return;
            }
            const currentLead = await this.prisma.lead.update({
                where: { id: leadId },
                data: updateData
            });
            let newAiStatus = 'NeedsClarification';
            const hasBudget = !!currentLead.budget;
            const hasTimeline = !!currentLead.timeline;
            const hasType = !!currentLead.type;
            if (hasBudget && hasTimeline && hasType) {
                const budgetStr = currentLead.budget?.toLowerCase() || '';
                if (budgetStr.includes('мало') || budgetStr.includes('безкоштовно')) {
                    newAiStatus = 'LowPotential';
                }
                else {
                    newAiStatus = 'Perspektive';
                }
            }
            else {
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
                if (newAiStatus === 'Perspektive' || newAiStatus === 'LowPotential') {
                    await this.notificationService.notifyManagersAboutLead(leadId);
                }
            }
        }
        catch (error) {
            this.logger.error(`Error qualifying lead ${leadId}:`, error);
        }
    }
};
exports.QualificationService = QualificationService;
exports.QualificationService = QualificationService = QualificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], QualificationService);
//# sourceMappingURL=qualification.service.js.map