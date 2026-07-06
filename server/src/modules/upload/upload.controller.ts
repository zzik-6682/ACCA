import { Controller, Post, UseInterceptors, UploadedFile, HttpCode } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { S3Storage } from 'coze-coding-dev-sdk'

@Controller('upload')
export class UploadController {
  private storage: S3Storage

  constructor() {
    this.storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    })
  }

  @Post('screenshot')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
  }))
  async uploadScreenshot(@UploadedFile() file: Express.Multer.File) {
    console.log('上传文件信息:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      hasBuffer: !!file.buffer
    })

    if (!file || !file.buffer) {
      return { code: 400, msg: '未收到文件', data: null }
    }

    try {
      // 上传到对象存储
      const key = await this.storage.uploadFile({
        fileContent: file.buffer,
        fileName: `screenshots/${Date.now()}_${file.originalname}`,
        contentType: file.mimetype
      })

      // 生成可访问的 URL（有效期7天）
      const url = await this.storage.generatePresignedUrl({
        key,
        expireTime: 7 * 24 * 60 * 60 // 7天
      })

      console.log('上传成功:', { key, url })

      return {
        code: 200,
        msg: '上传成功',
        data: { key, url }
      }
    } catch (error) {
      console.error('上传失败:', error)
      return { code: 500, msg: '上传失败', data: null }
    }
  }
}