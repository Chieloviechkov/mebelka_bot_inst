import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { InstagramModule } from '../instagram/instagram.module';

@Module({
  imports: [InstagramModule],
  controllers: [AdminController],
})
export class AdminModule {}
