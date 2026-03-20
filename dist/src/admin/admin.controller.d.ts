import { PrismaService } from '../prisma/prisma.service';
import { AiStatus } from '@prisma/client';
export declare class AdminController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getLeads(pageRaw?: string, limitRaw?: string): Promise<{
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        data: ({
            notes: {
                text: string;
                id: number;
                createdAt: Date;
                lead_id: number;
            }[];
            _count: {
                messages: number;
            };
        } & {
            type: string | null;
            id: number;
            instagram_id: string;
            dimensions: string | null;
            style: string | null;
            materials: string | null;
            budget: string | null;
            timeline: string | null;
            wishes: string | null;
            ai_status: import("@prisma/client").$Enums.AiStatus | null;
            status_history: import("@prisma/client/runtime/client").JsonValue | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
    }>;
    updateStatus(id: number, newStatus: AiStatus): Promise<{
        type: string | null;
        id: number;
        instagram_id: string;
        dimensions: string | null;
        style: string | null;
        materials: string | null;
        budget: string | null;
        timeline: string | null;
        wishes: string | null;
        ai_status: import("@prisma/client").$Enums.AiStatus | null;
        status_history: import("@prisma/client/runtime/client").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    addNote(id: number, text: string): Promise<{
        text: string;
        id: number;
        createdAt: Date;
        lead_id: number;
    }>;
    getAnalytics(): Promise<{
        totalLeads: number;
        conversionByStatus: Record<string, number>;
    }>;
}
