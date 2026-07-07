import { Injectable, Logger } from '@nestjs/common'
import { LLMClient, Config, ContentPart, Message } from 'coze-coding-dev-sdk'

@Injectable()
export class AiRecognizeService {
  private readonly logger = new Logger(AiRecognizeService.name)
  private llmClient: LLMClient

  constructor() {
    const config = new Config()
    this.llmClient = new LLMClient(config)
  }

  /**
   * 使用多模态大模型识别成绩截图中的分数信息
   * @param imageUrl 截图的公网可访问 URL
   * @returns 识别到的科目和分数信息
   */
  async recognizeScreenshot(imageUrl: string): Promise<{
    subjectCode: string
    subjectName: string
    score: number
    passStatus: boolean
  } | null> {
    this.logger.log('开始识别成绩截图:', { imageUrl })

    try {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `你是一个ACCA成绩截图识别助手。请仔细查看这张截图，提取以下信息：
1. 科目代码（如 F2, F3, F5, F7, F8, F9, SBL, SBR, AFM, APM, AAA 等）
2. 科目名称
3. 考试成绩（分数）
4. 是否通过（50分及以上为通过）

请严格按照以下JSON格式返回结果，不要包含其他内容：
{"subjectCode":"科目代码","subjectName":"科目全称","score":分数数字,"passStatus":true/false}

如果图片不是ACCA成绩截图或无法识别，请返回：null`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ] as ContentPart[]
        }
      ]

      const response = await this.llmClient.invoke(messages, {
        model: 'doubao-seed-2-0-pro-260215',
        temperature: 0.1
      })

      const content = response.content.trim()
      this.logger.log('AI 识别结果:', { content })

      // 尝试从返回内容中提取 JSON
      try {
        // 直接尝试解析整个内容
        if (content === 'null' || content === '') {
          return null
        }

        // 尝试匹配 JSON 对象
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0])
          return {
            subjectCode: result.subjectCode || '',
            subjectName: result.subjectName || '',
            score: typeof result.score === 'number' ? result.score : parseInt(result.score) || 0,
            passStatus: result.passStatus === true || result.passStatus === 'true'
          }
        }
      } catch (parseError) {
        this.logger.error('JSON 解析失败:', parseError)
      }

      return null
    } catch (error) {
      this.logger.error('AI 识别失败:', error)
      return null
    }
  }
}