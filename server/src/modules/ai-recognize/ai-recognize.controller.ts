import { Controller, Post, HttpCode, Body, Logger } from '@nestjs/common'
import { AiRecognizeService } from './ai-recognize.service'

@Controller('ai-recognize')
export class AiRecognizeController {
  private readonly logger = new Logger(AiRecognizeController.name)

  constructor(private readonly aiRecognizeService: AiRecognizeService) {}

  @Post('screenshot')
  @HttpCode(200)
  async recognizeScreenshot(@Body() body: { imageUrl: string }) {
    this.logger.log('收到截图识别请求:', { imageUrl: body.imageUrl })

    if (!body.imageUrl) {
      return { code: 400, msg: '缺少 imageUrl 参数', data: null }
    }

    try {
      const result = await this.aiRecognizeService.recognizeScreenshot(body.imageUrl)

      if (result) {
        return {
          code: 200,
          msg: '识别成功',
          data: result
        }
      } else {
        return {
          code: 200,
          msg: '未识别到成绩信息，请确认截图清晰可读',
          data: null
        }
      }
    } catch (error) {
      this.logger.error('截图识别异常:', error)
      return { code: 500, msg: '识别失败，请稍后重试', data: null }
    }
  }
}