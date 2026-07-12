import { Controller, Post, UseInterceptors, UploadedFile, HttpCode } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import * as fs from 'fs'
import * as path from 'path'

// 本地存储目录（阿里云 ECS 用）
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// 尝试加载 TOS SDK（沙箱环境）
let S3Storage: any = null
try {
  const sdk = require('coze-coding-dev-sdk')
  S3Storage = sdk.S3Storage
} catch {
  console.log('TOS SDK 不可用，使用本地存储')
}

@Controller('upload')
export class UploadController {
  private storage: any

  constructor() {
    if (S3Storage && process.env.COZE_BUCKET_ENDPOINT_URL) {
      this.storage = new S3Storage({
        endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
        accessKey: '',
        secretKey: '',
        bucketName: process.env.COZE_BUCKET_NAME,
        region: 'cn-beijing',
      })
    }
  }

  @Post('screenshot')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
  }))
  async uploadScreenshot(@UploadedFile() file: Express.Multer.File) {
    if (!file || !file.buffer) {
      return { code: 400, msg: '未收到文件', data: null }
    }

    const ext = path.extname(file.originalname) || '.jpg'
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`

    try {
      // 优先使用 TOS（沙箱环境）
      if (this.storage) {
        const key = await this.storage.uploadFile({
          fileContent: file.buffer,
          fileName: `screenshots/${filename}`,
          contentType: file.mimetype
        })
        const url = await this.storage.generatePresignedUrl({
          key,
          expireTime: 7 * 24 * 60 * 60
        })
        return { code: 200, msg: '上传成功', data: { key, url } }
      }

      // 本地存储（阿里云 ECS）
      const filePath = path.join(UPLOAD_DIR, filename)
      fs.writeFileSync(filePath, file.buffer)
      const url = `/uploads/${filename}`
      console.log('本地存储:', filePath, url)
      return { code: 200, msg: '上传成功', data: { key: filename, url } }
    } catch (error) {
      console.error('上传失败:', error)
      return { code: 500, msg: '上传失败', data: null }
    }
  }
}
