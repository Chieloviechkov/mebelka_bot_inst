import { Module } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { InstagramModule } from '../instagram/instagram.module';

@Module({
  imports: [InstagramModule],
  providers: [ReminderService],
})
export class ReminderModule {}
