import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'
import { S3Storage } from 'coze-coding-dev-sdk'

interface CreateExamRecordDto {
  student_no: string
  name: string
  grade: number
  class_name: string
  subject_code: string
  subject_name: string
  score?: number
  exam_season: string
  exam_type?: string // global_exam 全球考, final_exam 期末考试（免考科目）
  pass_status: boolean
  screenshot_key?: string
  notes?: string
}

export interface ExamRecord {
  id: string
  student_id: string
  subject_code: string
  subject_name: string
  score: number | null
  pass_status: boolean
  exam_season: string
  exam_type: string | null
  screenshot_key: string | null
  screenshot_url?: string | null
  notes: string | null
  created_at: string
  students: {
    name: string
    student_no: string
    grade: number
    class_name: string
  }
}

@Injectable()
export class ExamRecordsService {
  private client = getSupabaseClient()
  private storage = new S3Storage({
    endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
    accessKey: '',
    secretKey: '',
    bucketName: process.env.COZE_BUCKET_NAME,
    region: 'cn-beijing',
  })

  async createRecord(dto: CreateExamRecordDto) {
    console.log('创建考证记录:', dto)

    // 1. 先查找或创建学生
    let studentId: string

    const { data: existingStudent, error: studentError } = await this.client
      .from('students')
      .select('id')
      .eq('student_no', dto.student_no)
      .maybeSingle()

    if (studentError) {
      console.error('查询学生失败:', studentError)
      throw new Error(`查询学生失败: ${studentError.message}`)
    }

    if (existingStudent) {
      studentId = existingStudent.id
      console.log('找到已有学生:', studentId)
    } else {
      // 创建新学生
      const { data: newStudent, error: createError } = await this.client
        .from('students')
        .insert({
          student_no: dto.student_no,
          name: dto.name,
          grade: dto.grade,
          class_name: dto.class_name
        })
        .select('id')
        .single()

      if (createError) {
        console.error('创建学生失败:', createError)
        throw new Error(`创建学生失败: ${createError.message}`)
      }

      studentId = newStudent.id
      console.log('创建新学生:', studentId)
    }

    // 2. 创建考证记录
    const { data: record, error: recordError } = await this.client
      .from('exam_records')
      .insert({
        student_id: studentId,
        subject_code: dto.subject_code,
        subject_name: dto.subject_name,
        score: dto.score ?? null,
        exam_season: dto.exam_season,
        exam_type: dto.exam_type ?? 'global_exam', // 默认全球考，免考科目传 final_exam
        pass_status: dto.pass_status,
        screenshot_key: dto.screenshot_key ?? null,
        notes: dto.notes ?? null
      })
      .select()
      .single()

    if (recordError) {
      console.error('创建记录失败:', recordError)
      throw new Error(`创建记录失败: ${recordError.message}`)
    }

    console.log('记录创建成功:', record)
    return record
  }

  async batchImportStudents(students: any[]) {
    console.log('批量导入学生:', students.length)
    
    const importedStudents: any[] = []
    const errors: string[] = []

    for (const student of students) {
      try {
        // 检查学生是否已存在
        const { data: existing } = await this.client
          .from('students')
          .select('id')
          .eq('student_no', student.student_no)
          .single()

        if (existing) {
          console.log(`学生 ${student.student_no} 已存在，跳过`)
          continue
        }

        // 创建学生
        const { data: newStudent, error } = await this.client
          .from('students')
          .insert({
            student_no: student.student_no,
            name: student.name,
            grade: student.grade,
            class_name: student.class_name,
            password: null
          })
          .select()
          .single()

        if (error) {
          errors.push(`${student.student_no}: ${error.message}`)
        } else {
          importedStudents.push(newStudent)
        }
      } catch (err) {
        errors.push(`${student.student_no}: ${err.message}`)
      }
    }

    console.log(`导入完成: ${importedStudents.length} 成功, ${errors.length} 失败`)
    return {
      imported: importedStudents.length,
      errors: errors.length,
      details: importedStudents
    }
  }

  async getMyRecords(keyword: string): Promise<ExamRecord[]> {
    console.log('查询考证记录:', keyword)

    // 1. 先查询学生（根据学号或姓名）
    const { data: students, error: studentError } = await this.client
      .from('students')
      .select('id, name, student_no, grade, class_name')
      .or(`student_no.ilike.%${keyword}%,name.ilike.%${keyword}%`)

    if (studentError) {
      console.error('查询学生失败:', studentError)
      throw new Error(`查询学生失败: ${studentError.message}`)
    }

    if (!students || students.length === 0) {
      console.log('未找到匹配的学生')
      return []
    }

    console.log('找到学生:', students.length)

    // 2. 根据学生ID查询考证记录
    const studentIds = students.map(s => s.id)
    
    const { data: records, error: recordError } = await this.client
      .from('exam_records')
      .select(`
        id,
        student_id,
        subject_code,
        subject_name,
        score,
        pass_status,
        exam_season,
        screenshot_key,
        notes,
        created_at
      `)
      .in('student_id', studentIds)
      .order('created_at', { ascending: false })

    if (recordError) {
      console.error('查询记录失败:', recordError)
      throw new Error(`查询记录失败: ${recordError.message}`)
    }

    // 3. 组装数据（将学生信息附加到记录）
    const studentMap = new Map()
    for (const student of students) {
      studentMap.set(student.id, student)
    }

    const formattedData = (records || []).map((record: any) => ({
      ...record,
      students: studentMap.get(record.student_id)
    }))
    
    console.log('查询结果:', formattedData.length, '条记录')
    return formattedData as ExamRecord[]
  }

  async batchImport(students: any[]) {
    console.log('开始批量导入:', students.length, '名学生')
    
    let successCount = 0
    let failCount = 0
    const errors: string[] = []
    
    for (const student of students) {
      try {
        // 先查找学生
        const { data: existingStudent } = await this.client
          .from('students')
          .select('id')
          .eq('student_no', student.student_no)
          .maybeSingle()
        
        // 如果学生已存在，先删除该学生的所有旧考试记录
        if (existingStudent) {
          const { error: deleteError } = await this.client
            .from('exam_records')
            .delete()
            .eq('student_id', existingStudent.id)
          
          if (deleteError) {
            console.error('删除旧记录失败:', student.name, deleteError)
          } else {
            console.log(`已删除 ${student.name} 的旧记录`)
          }
        }
        
        // 重新导入学生的考试记录
        for (const examRecord of student.exam_records) {
          await this.createRecord({
            student_no: student.student_no,
            name: student.name,
            grade: student.grade,
            class_name: student.class_name,
            subject_code: examRecord.subject_code,
            subject_name: examRecord.subject_name,
            score: examRecord.score,
            exam_season: examRecord.exam_season,
            exam_type: examRecord.exam_type,
            pass_status: examRecord.pass_status,
            notes: examRecord.notes
          })
          successCount++
        }
      } catch (error) {
        failCount++
        errors.push(`${student.name}: ${error.message}`)
        console.error('导入学生失败:', student.name, error)
      }
    }
    
    return {
      total_students: students.length,
      success_records: successCount,
      fail_records: failCount,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  /**
   * 设置密码 - 验证学号和姓名后设置密码
   */
  async setPassword(student_no: string, name: string, password: string): Promise<{ success: boolean; message: string }> {
    console.log('设置密码:', student_no, name)

    // 1. 先验证学号和姓名是否匹配
    const { data: student, error } = await this.client
      .from('students')
      .select('id, name, password')
      .eq('student_no', student_no)
      .maybeSingle()

    if (error) {
      console.error('查询学生失败:', error)
      return { success: false, message: '查询失败' }
    }

    if (!student) {
      return { success: false, message: '学号不存在' }
    }

    if (student.name !== name) {
      return { success: false, message: '姓名与学号不匹配' }
    }

    // 2. 检查是否已设置密码
    if (student.password) {
      return { success: false, message: '已设置密码，如需修改请联系管理员' }
    }

    // 3. 设置密码
    const { error: updateError } = await this.client
      .from('students')
      .update({ password: password })
      .eq('id', student.id)

    if (updateError) {
      console.error('设置密码失败:', updateError)
      return { success: false, message: '设置密码失败' }
    }

    console.log('密码设置成功:', student_no)
    return { success: true, message: '密码设置成功' }
  }

  /**
   * 登录 - 验证学号和密码
   */
  async login(student_no: string, password: string): Promise<{ success: boolean; message: string; name?: string; grade?: number; class_name?: string }> {
    console.log('登录验证:', student_no)

    const { data: student, error } = await this.client
      .from('students')
      .select('id, name, grade, class_name, password')
      .eq('student_no', student_no)
      .maybeSingle()

    if (error) {
      console.error('查询学生失败:', error)
      return { success: false, message: '查询失败' }
    }

    if (!student) {
      return { success: false, message: '学号不存在' }
    }

    if (!student.password) {
      return { success: false, message: '请先设置密码' }
    }

    if (student.password !== password) {
      return { success: false, message: '密码错误' }
    }

    console.log('登录成功:', student_no, student.name)
    return { 
      success: true, 
      message: '登录成功',
      name: student.name,
      grade: student.grade,
      class_name: student.class_name
    }
  }

  /**
   * 检查是否已设置密码
   */
  async hasPassword(student_no: string): Promise<boolean> {
    const { data: student, error } = await this.client
      .from('students')
      .select('password')
      .eq('student_no', student_no)
      .maybeSingle()

    if (error || !student) {
      return false
    }

    return !!student.password
  }

  /**
   * 根据学号查询记录
   */
  async getRecordsByStudentNo(student_no: string): Promise<ExamRecord[]> {
    console.log('按学号查询记录:', student_no)

    // 1. 先查询学生
    const { data: student, error: studentError } = await this.client
      .from('students')
      .select('id, name, student_no, grade, class_name')
      .eq('student_no', student_no)
      .maybeSingle()

    if (studentError) {
      console.error('查询学生失败:', studentError)
      throw new Error(`查询学生失败: ${studentError.message}`)
    }

    if (!student) {
      console.log('未找到学生')
      return []
    }

    // 2. 查询考证记录
    const { data: records, error: recordError } = await this.client
      .from('exam_records')
      .select(`
        id,
        student_id,
        subject_code,
        subject_name,
        score,
        pass_status,
        exam_season,
        exam_type,
        screenshot_key,
        notes,
        created_at
      `)
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })

    if (recordError) {
      console.error('查询记录失败:', recordError)
      throw new Error(`查询记录失败: ${recordError.message}`)
    }

    // 3. 组装数据并生成截图URL
    const formattedData = await Promise.all((records || []).map(async (record: any) => {
      let screenshot_url: string | null = null
      if (record.screenshot_key) {
        try {
          screenshot_url = await this.storage.generatePresignedUrl({
            key: record.screenshot_key,
            expireTime: 86400 * 7 // 7天有效期
          })
        } catch (e) {
          console.error('生成截图URL失败:', e)
        }
      }
      return {
        ...record,
        screenshot_url,
        students: student
      }
    }))
    
    console.log('查询结果:', formattedData.length, '条记录')
    return formattedData as ExamRecord[]
  }
}