import { Controller, Get, Query, HttpCode } from '@nestjs/common'
import { StatisticsService } from './statistics.service'

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  @HttpCode(200)
  async getStatistics(@Query('grade') grade?: string) {
    console.log('收到统计请求, grade:', grade)
    
    try {
      const data = await this.statisticsService.getStatistics(grade)
      return {
        code: 200,
        msg: '查询成功',
        data
      }
    } catch (error) {
      console.error('统计失败:', error)
      return {
        code: 500,
        msg: error.message || '统计失败',
        data: null
      }
    }
  }
}