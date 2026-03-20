import type { Request, Response } from 'express';
import { InstagramService } from './instagram.service';
export declare class InstagramController {
    private readonly instagramService;
    constructor(instagramService: InstagramService);
    verifyWebhook(req: Request, res: Response): void;
    handleWebhook(body: any, res: Response): Promise<void>;
}
