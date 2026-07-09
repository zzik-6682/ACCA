import { Controller, Post, Get, Body, Query, HttpCode, Delete, Param } from '@nestjs/common'
import { ExamRecordsService } from './exam-records.service'

@Controller('exam-records')
export class ExamRecordsController {
  constructor(private readonly examRecordsService: ExamRecordsService) {}

  @Post()
  @HttpCode(200)
  async create(@Body() body: any) {
    console.log('收到创建请求:', body)
    
    try {
      const record = await this.examRecordsService.createRecord(body)
      return {
        code: 200,
        msg: '创建成功',
        data: record
      }
    } catch (error) {
      console.error('创建失败:', error)
      return {
        code: 500,
        msg: error.message || '创建失败',
        data: null
      }
    }
  }

  @Post('batch-import-students')
  @HttpCode(200)
  async batchImportStudents(@Body() body: { students: any[] }) {
    console.log('收到批量导入学生请求:', body.students?.length, '名学生')
    
    if (!body.students || body.students.length === 0) {
      return {
        code: 400,
        msg: '请提供学生数据',
        data: null
      }
    }
    
    try {
      const result = await this.examRecordsService.batchImportStudents(body.students)
      return {
        code: 200,
        msg: '批量导入学生成功',
        data: result
      }
    } catch (error) {
      console.error('批量导入学生失败:', error)
      return {
        code: 500,
        msg: error.message || '批量导入学生失败',
        data: null
      }
    }
  }

  @Post('batch-import')
  @HttpCode(200)
  async batchImport(@Body() body: { students: any[] }) {
    console.log('收到批量导入请求:', body.students?.length, '名学生')
    
    if (!body.students || body.students.length === 0) {
      return {
        code: 400,
        msg: '请提供学生数据',
        data: null
      }
    }
    
    try {
      const result = await this.examRecordsService.batchImport(body.students)
      return {
        code: 200,
        msg: '批量导入成功',
        data: result
      }
    } catch (error) {
      console.error('批量导入失败:', error)
      return {
        code: 500,
        msg: error.message || '批量导入失败',
        data: null
      }
    }
  }

  /**
   * 设置密码 - 学生首次使用时设置密码
   */
  @Post('set-password')
  @HttpCode(200)
  async setPassword(@Body() body: { student_no: string; name: string; password: string }) {
    console.log('收到设置密码请求:', body.student_no, body.name)
    
    if (!body.student_no || !body.name || !body.password) {
      return {
        code: 400,
        msg: '请提供学号、姓名和密码',
        data: null
      }
    }
    
    if (body.password.length < 4) {
      return {
        code: 400,
        msg: '密码至少需要4位',
        data: null
      }
    }
    
    try {
      const result = await this.examRecordsService.setPassword(body.student_no, body.name, body.password)
      if (result.success) {
        return {
          code: 200,
          msg: result.message,
          data: { student_no: body.student_no, name: body.name }
        }
      } else {
        return {
          code: 400,
          msg: result.message,
          data: null
        }
      }
    } catch (error) {
      console.error('设置密码失败:', error)
      return {
        code: 500,
        msg: error.message || '设置密码失败',
        data: null
      }
    }
  }

  /**
   * 登录 - 验证学号和密码
   */
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { student_no: string; password: string }) {
    console.log('收到登录请求:', body.student_no)
    
    if (!body.student_no || !body.password) {
      return {
        code: 400,
        msg: '请提供学号和密码',
        data: null
      }
    }
    
    try {
      const result = await this.examRecordsService.login(body.student_no, body.password)
      if (result.success) {
        return {
          code: 200,
          msg: '登录成功',
          data: { student_no: body.student_no, name: result.name, grade: result.grade, class_name: result.class_name }
        }
      } else {
        return {
          code: 401,
          msg: result.message,
          data: null
        }
      }
    } catch (error) {
      console.error('登录失败:', error)
      return {
        code: 500,
        msg: error.message || '登录失败',
        data: null
      }
    }
  }

  /**
   * 安全查询 - 登录后查看自己的考试记录
   */
  @Post('my-records')
  @HttpCode(200)
  async getMyRecords(@Body() body: { student_no: string; password: string }) {
    console.log('收到安全查询请求:', body.student_no)
    
    if (!body.student_no || !body.password) {
      return {
        code: 400,
        msg: '请提供学号和密码',
        data: []
      }
    }
    
    try {
      // 先验证密码
      const loginResult = await this.examRecordsService.login(body.student_no, body.password)
      if (!loginResult.success) {
        return {
          code: 401,
          msg: loginResult.message,
          data: []
        }
      }
      
      // 验证成功后返回记录
      const records = await this.examRecordsService.getRecordsByStudentNo(body.student_no)
      return {
        code: 200,
        msg: '查询成功',
        data: records
      }
    } catch (error) {
      console.error('查询失败:', error)
      return {
        code: 500,
        msg: error.message || '查询失败',
        data: []
      }
    }
  }

  /**
   * 检查学号是否已设置密码
   */
  @Get('check-password')
  @HttpCode(200)
  async checkPassword(@Query('student_no') student_no: string) {
    console.log('检查密码状态:', student_no)
    
    if (!student_no) {
      return {
        code: 400,
        msg: '请提供学号',
        data: null
      }
    }
    
    try {
      const hasPassword = await this.examRecordsService.hasPassword(student_no)
      return {
        code: 200,
        msg: '查询成功',
        data: { has_password: hasPassword }
      }
    } catch (error) {
      console.error('查询失败:', error)
      return {
        code: 500,
        msg: error.message || '查询失败',
        data: null
      }
    }
  }

  @Delete('fix-duplicates')
  @HttpCode(200)
  async fixDuplicates() {
    return this.examRecordsService.fixDuplicates()
  }

  @Delete('student/:student_no')
  @HttpCode(200)
  async deleteStudent(@Param('student_no') student_no: string) {
    return this.examRecordsService.deleteStudent(student_no)
  }

  /**
   * 导师登录
   */
  @Post('advisor/login')
  @HttpCode(200)
  async advisorLogin(@Body() body: { name: string }) {
    if (!body.name) {
      return { code: 400, msg: '请输入导师姓名', data: null }
    }
    const result = await this.examRecordsService.advisorLogin(body.name)
    return {
      code: result.success ? 200 : 401,
      msg: result.message,
      data: result.success ? { name: body.name, student_count: result.student_count } : null
    }
  }

  /**
   * 获取导师的学生列表
   */
  @Get('advisor/students')
  async getAdvisorStudents(@Query('name') name: string) {
    if (!name) {
      return { code: 400, msg: '请输入导师姓名', data: [] }
    }
    try {
      const students = await this.examRecordsService.getAdvisorStudents(name)
      return { code: 200, msg: '查询成功', data: students }
    } catch (error) {
      return { code: 500, msg: error.message || '查询失败', data: [] }
    }
  }
}