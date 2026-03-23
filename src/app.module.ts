import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { InstagramModule } from './instagram/instagram.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module.js';
import { NotificationModule } from './notification/notification.module.js';
import { AdminModule } from './admin/admin.module.js';
import { ReminderModule } from './reminder/reminder.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 10 }] }),
    PrismaModule,
    NotificationModule,
    AiAssistantModule,
    InstagramModule,
    AdminModule,
    ReminderModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
