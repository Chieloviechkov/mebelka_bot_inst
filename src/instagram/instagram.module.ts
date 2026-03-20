import { Module } from '@nestjs/common';
import { InstagramService } from './instagram.service';
import { InstagramController } from './instagram.controller';
import { AiAssistantModule } from '../ai-assistant/ai-assistant.module';

@Module({
  imports: [AiAssistantModule],
  providers: [InstagramService],
  controllers: [InstagramController]
})
export class InstagramModule {}
