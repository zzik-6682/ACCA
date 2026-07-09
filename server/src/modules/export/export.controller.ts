import { Controller, Get, Query, Res } from '@nestjs/common'
import { Response } from 'express'
import { ExportService } from './export.service'

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('excel')
  async exportExcel(
    @Query('password') password: string,
    @Res() res: Response
  ) {
    // 验证管理员密码
    const adminPassword = 'acca520'
    if (password !== adminPassword) {
      res.status(401).json({ code: 401, msg: '密码错误' })
      return
    }

    try {
      const buffer = await this.exportService.generateExcel()
      
      // 设置响应头（文件名需要编码以支持中文）
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      const filename = encodeURIComponent('ACCA考试成绩统计.xlsx')
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`)
      
      // 发送文件
      res.send(buffer)
    } catch (error) {
      console.error('导出 Excel 失败:', error)
      res.status(500).json({ code: 500, msg: '导出失败' })
    }
  }
}