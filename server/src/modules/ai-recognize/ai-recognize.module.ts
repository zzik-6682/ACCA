import { Module } from '@nestjs/common'
import { AiRecognizeController } from './ai-recognize.controller'
import { AiRecognizeService } from './ai-recognize.service'

@Module({
  controllers: [AiRecognizeController],
  providers: [AiRecognizeService],
  exports: [AiRecognizeService]
})
export class AiRecognizeModule {}