import { Module } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { QualificationModule } from '../qualification/qualification.module';

@Module({
  imports: [QualificationModule],
  providers: [AiAssistantService],
  exports: [AiAssistantService]
})
export class AiAssistantModule {}
