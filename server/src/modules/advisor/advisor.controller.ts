import { Controller, Post, Get, Body, Query, HttpCode } from '@nestjs/common'
import { AdvisorService } from './advisor.service'

@Controller('advisor')
export class AdvisorController {
  constructor(private readonly advisorService: AdvisorService) {}

  @Get('check-password')
  @HttpCode(200)
  async checkPassword(@Query('name') name: string) {
    if (!name) {
      return { code: 400, msg: '请提供导师姓名', data: null }
    }

    try {
      const hasPassword = await this.advisorService.hasPassword(name)
      return { code: 200, msg: '查询成功', data: { has_password: hasPassword } }
    } catch (error) {
      return { code: 500, msg: error.message || '查询失败', data: null }
    }
  }

  @Post('set-password')
  @HttpCode(200)
  async setPassword(@Body() body: { name: string; password: string }) {
    if (!body.name || !body.password) {
      return { code: 400, msg: '请提供姓名和密码', data: null }
    }

    if (body.password.length < 4) {
      return { code: 400, msg: '密码至少需要4位', data: null }
    }

    try {
      const result = await this.advisorService.setPassword(body.name, body.password)
      if (result.success) {
        return { code: 200, msg: result.message, data: { name: body.name } }
      } else {
        return { code: 400, msg: result.message, data: null }
      }
    } catch (error) {
      return { code: 500, msg: error.message || '设置密码失败', data: null }
    }
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { name: string; password: string }) {
    if (!body.name || !body.password) {
      return { code: 400, msg: '请提供姓名和密码', data: null }
    }

    try {
      const result = await this.advisorService.login(body.name, body.password)
      if (result.success) {
        return { code: 200, msg: '登录成功', data: { name: result.name } }
      } else {
        return { code: 401, msg: result.message, data: null }
      }
    } catch (error) {
      return { code: 500, msg: error.message || '登录失败', data: null }
    }
  }

  @Post('my-students')
  @HttpCode(200)
  async getMyStudents(@Body() body: { name: string; password: string }) {
    if (!body.name || !body.password) {
      return { code: 400, msg: '请提供姓名和密码', data: [] }
    }

    try {
      // Verify login
      const loginResult = await this.advisorService.login(body.name, body.password)
      if (!loginResult.success) {
        return { code: 401, msg: loginResult.message, data: [] }
      }

      const students = await this.advisorService.getMyStudents(body.name)
      return { code: 200, msg: '查询成功', data: students }
    } catch (error) {
      return { code: 500, msg: error.message || '查询失败', data: [] }
    }
  }
}
