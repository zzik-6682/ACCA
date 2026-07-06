import { Module } from '@nestjs/common'
import { ExamRecordsController } from './exam-records.controller'
import { ExamRecordsService } from './exam-records.service'

@Module({
  controllers: [ExamRecordsController],
  providers: [ExamRecordsService],
})
export class ExamRecordsModule {}