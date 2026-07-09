import { Module } from '@nestjs/common'
import { AppController } from '@/app.controller'
import { AppService } from '@/app.service'
import { UploadModule } from '@/modules/upload/upload.module'
import { ExamRecordsModule } from '@/modules/exam-records/exam-records.module'
import { StatisticsModule } from '@/modules/statistics/statistics.module'
import { AiRecognizeModule } from '@/modules/ai-recognize/ai-recognize.module'
import { ExportModule } from '@/modules/export/export.module'
import { AdvisorModule } from '@/modules/advisor/advisor.module'

@Module({
  imports: [
    UploadModule,
    ExamRecordsModule,
    StatisticsModule,
    AiRecognizeModule,
    ExportModule,
    AdvisorModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}