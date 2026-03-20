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
exports.InstagramController = void 0;
const common_1 = require("@nestjs/common");
const instagram_service_1 = require("./instagram.service");
let InstagramController = class InstagramController {
    instagramService;
    constructor(instagramService) {
        this.instagramService = instagramService;
    }
    verifyWebhook(req, res) {
        const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'your_verify_token_here';
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        if (mode && token) {
            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                console.log('WEBHOOK_VERIFIED');
                res.status(common_1.HttpStatus.OK).send(challenge);
            }
            else {
                res.sendStatus(common_1.HttpStatus.FORBIDDEN);
            }
        }
        else {
            res.sendStatus(common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async handleWebhook(body, res) {
        if (body.object === 'instagram') {
            console.log('Received Instagram Webhook:', JSON.stringify(body, null, 2));
            await this.instagramService.processWebhook(body);
            res.status(common_1.HttpStatus.OK).send('EVENT_RECEIVED');
        }
        else {
            res.sendStatus(common_1.HttpStatus.NOT_FOUND);
        }
    }
};
exports.InstagramController = InstagramController;
__decorate([
    (0, common_1.Get)('webhook'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], InstagramController.prototype, "verifyWebhook", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], InstagramController.prototype, "handleWebhook", null);
exports.InstagramController = InstagramController = __decorate([
    (0, common_1.Controller)('instagram'),
    __metadata("design:paramtypes", [instagram_service_1.InstagramService])
], InstagramController);
//# sourceMappingURL=instagram.controller.js.map