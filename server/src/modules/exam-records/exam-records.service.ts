import { Injectable } from '@nestjs/common'
import { eq, like, or, inArray, desc, asc, count, and } from 'drizzle-orm'
import { getDb } from '@/storage/database/drizzle-client'
import { students, examRecords, advisors } from '@/storage/database/shared/schema'
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
  exam_type?: string
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
  created_at: string | Date
  students: {
    name: string
    student_no: string
    grade: number
    class_name: string
  }
}

@Injectable()
export class ExamRecordsService {
  private db = getDb()
  private storage = new S3Storage({
    endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
    accessKey: '',
    secretKey: '',
    bucketName: process.env.COZE_BUCKET_NAME,
    region: 'cn-beijing',
  })

  async createRecord(dto: CreateExamRecordDto) {
    console.log('创建考证记录:', dto)

    // 1. 查询学生
    const existingStudent = await this.db.query.students.findFirst({
      where: eq(students.student_no, dto.student_no),
      columns: { id: true, name: true },
    })

    if (!existingStudent) {
      throw new Error('个人信息填写错误：未找到该学号的学生记录，请检查学号是否正确')
    }

    // 2. 校验姓名是否匹配
    if (existingStudent.name !== dto.name) {
      throw new Error(`姓名与学号不匹配：该学号对应的姓名为「${existingStudent.name}」`)
    }

    const studentId = existingStudent.id
    console.log('找到学生:', studentId, existingStudent.name)

    // 3. 创建考证记录
    const [record] = await this.db
      .insert(examRecords)
      .values({
        student_id: studentId,
        subject_code: dto.subject_code,
        subject_name: dto.subject_name,
        score: dto.score ?? null,
        exam_season: dto.exam_season,
        exam_type: dto.exam_type ?? 'global_exam',
        pass_status: dto.pass_status,
        screenshot_key: dto.screenshot_key ?? null,
        notes: dto.notes ?? null,
      })
      .returning()

    console.log('记录创建成功:', record.id)
    return record
  }

  async batchImportStudents(studentList: any[]) {
    console.log('批量导入学生:', studentList.length)
    
    const importedStudents: any[] = []
    const errors: string[] = []

    for (const student of studentList) {
      try {
        const existing = await this.db.query.students.findFirst({
          where: eq(students.student_no, student.student_no),
          columns: { id: true },
        })

        if (existing) {
          console.log(`学生 ${student.student_no} 已存在，跳过`)
          continue
        }

        const [newStudent] = await this.db
          .insert(students)
          .values({
            student_no: student.student_no,
            name: student.name,
            grade: student.grade,
            class_name: student.class_name,
            password: null,
          })
          .returning()

        importedStudents.push(newStudent)
      } catch (err: any) {
        errors.push(`${student.student_no}: ${err.message}`)
      }
    }

    console.log(`导入完成: ${importedStudents.length} 成功, ${errors.length} 失败`)
    return {
      imported: importedStudents.length,
      errors: errors.length,
      details: importedStudents,
    }
  }

  async getMyRecords(keyword: string): Promise<ExamRecord[]> {
    console.log('查询考证记录:', keyword)

    const matchedStudents = await this.db.query.students.findMany({
      where: or(
        like(students.student_no, `%${keyword}%`),
        like(students.name, `%${keyword}%`),
      ),
      columns: { id: true, name: true, student_no: true, grade: true, class_name: true },
    })

    if (matchedStudents.length === 0) {
      console.log('未找到匹配的学生')
      return []
    }

    console.log('找到学生:', matchedStudents.length)

    const studentIds = matchedStudents.map(s => s.id)
    const records = await this.db.query.examRecords.findMany({
      where: inArray(examRecords.student_id, studentIds),
      orderBy: [desc(examRecords.created_at)],
      columns: {
        id: true, student_id: true, subject_code: true, subject_name: true,
        score: true, pass_status: true, exam_season: true, screenshot_key: true,
        notes: true, created_at: true,
      },
    })

    const studentMap = new Map()
    for (const s of matchedStudents) {
      studentMap.set(s.id, {
        name: s.name,
        student_no: s.student_no,
        grade: s.grade,
        class_name: s.class_name,
      })
    }

    const formattedData = records.map(record => ({
      id: record.id,
      student_id: record.student_id,
      subject_code: record.subject_code,
      subject_name: record.subject_name,
      score: record.score,
      pass_status: record.pass_status,
      exam_season: record.exam_season,
      exam_type: null,
      screenshot_key: record.screenshot_key,
      notes: record.notes,
      created_at: record.created_at,
      students: studentMap.get(record.student_id),
    }))
    
    console.log('查询结果:', formattedData.length, '条记录')
    return formattedData as ExamRecord[]
  }

  async batchImport(studentList: any[]) {
    console.log('开始批量导入:', studentList.length, '名学生')
    
    let successCount = 0
    let failCount = 0
    const errors: string[] = []
    
    for (const student of studentList) {
      try {
        const existingStudent = await this.db.query.students.findFirst({
          where: eq(students.student_no, student.student_no),
          columns: { id: true },
        })
        
        if (existingStudent) {
          await this.db.delete(examRecords).where(eq(examRecords.student_id, existingStudent.id))
          console.log(`已删除 ${student.name} 的旧记录`)
        }
        
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
            notes: examRecord.notes,
          })
          successCount++
        }
      } catch (error: any) {
        failCount++
        errors.push(`${student.name}: ${error.message}`)
        console.error('导入学生失败:', student.name, error)
      }
    }
    
    return {
      total_students: studentList.length,
      success_records: successCount,
      fail_records: failCount,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  async setPassword(student_no: string, name: string, password: string): Promise<{ success: boolean; message: string }> {
    console.log('设置密码:', student_no, name)

    const student = await this.db.query.students.findFirst({
      where: eq(students.student_no, student_no),
      columns: { id: true, name: true, password: true },
    })

    if (!student) return { success: false, message: '学号不存在' }
    if (student.name !== name) return { success: false, message: '姓名与学号不匹配' }
    if (student.password) return { success: false, message: '已设置密码，如需修改请联系管理员' }

    await this.db.update(students).set({ password }).where(eq(students.id, student.id))

    console.log('密码设置成功:', student_no)
    return { success: true, message: '密码设置成功' }
  }

  async login(student_no: string, password: string): Promise<{ success: boolean; message: string; name?: string; grade?: number; class_name?: string }> {
    console.log('登录验证:', student_no)

    const student = await this.db.query.students.findFirst({
      where: eq(students.student_no, student_no),
      columns: { id: true, name: true, grade: true, class_name: true, password: true },
    })

    if (!student) return { success: false, message: '学号不存在' }
    if (!student.password) return { success: false, message: '请先设置密码' }
    if (student.password !== password) return { success: false, message: '密码错误' }

    console.log('登录成功:', student_no, student.name)
    return { 
      success: true, 
      message: '登录成功',
      name: student.name,
      grade: student.grade,
      class_name: student.class_name,
    }
  }

  async hasPassword(student_no: string): Promise<boolean> {
    const student = await this.db.query.students.findFirst({
      where: eq(students.student_no, student_no),
      columns: { password: true },
    })
    return !!student?.password
  }

  async verifyStudent(student_no: string, name: string): Promise<{ valid: boolean; message: string; student?: any }> {
    const student = await this.db.query.students.findFirst({
      where: eq(students.student_no, student_no),
      columns: { id: true, student_no: true, name: true, grade: true, class_name: true },
    })

    if (!student) {
      return { valid: false, message: '学号不存在，请检查学号是否正确' }
    }

    if (student.name !== name) {
      return { valid: false, message: `学号 ${student_no} 对应的姓名是 ${student.name}，与填写的 ${name} 不符` }
    }

    return {
      valid: true,
      message: '验证通过',
      student: {
        id: student.id,
        student_no: student.student_no,
        name: student.name,
        grade: student.grade,
        class_name: student.class_name,
      },
    }
  }

  async getRecordsByStudentNo(student_no: string): Promise<ExamRecord[]> {
    console.log('按学号查询记录:', student_no)

    const student = await this.db.query.students.findFirst({
      where: eq(students.student_no, student_no),
      columns: { id: true, name: true, student_no: true, grade: true, class_name: true },
    })

    if (!student) {
      console.log('未找到学生')
      return []
    }

    const records = await this.db.query.examRecords.findMany({
      where: eq(examRecords.student_id, student.id),
      orderBy: [desc(examRecords.created_at)],
      columns: {
        id: true, student_id: true, subject_code: true, subject_name: true,
        score: true, pass_status: true, exam_season: true, exam_type: true,
        screenshot_key: true, notes: true, created_at: true,
      },
    })

    const useLocalStorage = !!process.env.LOCAL_UPLOAD_DIR
    const studentInfo = {
      name: student.name,
      student_no: student.student_no,
      grade: student.grade,
      class_name: student.class_name,
    }

    const formattedData = await Promise.all(records.map(async (record) => {
      let screenshot_url: string | null = null
      if (record.screenshot_key) {
        try {
          if (useLocalStorage) {
            screenshot_url = `/uploads/${record.screenshot_key}`
          } else {
            screenshot_url = await this.storage.generatePresignedUrl({
              key: record.screenshot_key,
              expireTime: 86400 * 7,
            })
          }
        } catch (e) {
          console.error('生成截图URL失败:', e)
        }
      }
      return {
        id: record.id,
        student_id: record.student_id,
        subject_code: record.subject_code,
        subject_name: record.subject_name,
        score: record.score,
        pass_status: record.pass_status,
        exam_season: record.exam_season,
        exam_type: record.exam_type,
        screenshot_key: record.screenshot_key,
        screenshot_url,
        notes: record.notes,
        created_at: record.created_at,
        students: studentInfo,
      }
    }))
    
    console.log('查询结果:', formattedData.length, '条记录')
    return formattedData as ExamRecord[]
  }

  async fixDuplicates() {
    const allStudents = await this.db.query.students.findMany({
      orderBy: [asc(students.name)],
      columns: { id: true, student_no: true, name: true, grade: true, class_name: true },
    })

    const groups: Record<string, typeof allStudents> = {}
    for (const s of allStudents) {
      const key = `${s.name}|${s.grade}|${s.class_name}`
      if (!groups[key]) groups[key] = []
      groups[key].push(s)
    }

    let fixedCount = 0
    let movedRecords = 0

    for (const [, groupStudents] of Object.entries(groups)) {
      if (groupStudents.length <= 1) continue

      const sorted = [...groupStudents].sort((a, b) => {
        if (a.student_no.length !== b.student_no.length)
          return b.student_no.length - a.student_no.length
        return b.student_no.localeCompare(a.student_no)
      })

      const correct = sorted[0]
      const badStudents = sorted.slice(1)

      for (const bad of badStudents) {
        const badRecords = await this.db.query.examRecords.findMany({
          where: eq(examRecords.student_id, bad.id),
          columns: { id: true },
        })

        if (badRecords.length > 0) {
          const [updated] = await this.db
            .update(examRecords)
            .set({ student_id: correct.id })
            .where(eq(examRecords.student_id, bad.id))
          if (updated) movedRecords += badRecords.length
        }

        await this.db.delete(students).where(eq(students.id, bad.id))
        fixedCount++
      }
    }

    return {
      code: 200,
      msg: '修复完成',
      data: { deleted_students: fixedCount, moved_records: movedRecords },
    }
  }

  async advisorLogin(advisorName: string, password: string): Promise<{ success: boolean; message: string; student_count?: number }> {
    const advisor = await this.db.query.advisors.findFirst({
      where: eq(advisors.name, advisorName),
      columns: { name: true, password_hash: true },
    })

    if (!advisor) return { success: false, message: '导师姓名不存在' }
    if (!advisor.password_hash) return { success: false, message: '请先设置密码' }
    if (advisor.password_hash !== password) return { success: false, message: '密码错误' }

    const result = await this.db
      .select({ count: count() })
      .from(students)
      .where(eq(students.advisor_name, advisorName))

    return { success: true, message: '登录成功', student_count: Number(result[0]?.count || 0) }
  }

  async advisorHasPassword(advisorName: string): Promise<boolean> {
    const advisor = await this.db.query.advisors.findFirst({
      where: eq(advisors.name, advisorName),
      columns: { password_hash: true },
    })
    return !!advisor?.password_hash
  }

  async advisorSetPassword(advisorName: string, password: string): Promise<{ success: boolean; message: string }> {
    const advisor = await this.db.query.advisors.findFirst({
      where: eq(advisors.name, advisorName),
      columns: { name: true, password_hash: true },
    })

    if (!advisor) return { success: false, message: '导师姓名不存在' }
    if (advisor.password_hash) return { success: false, message: '已设置过密码，如需修改请联系管理员' }

    await this.db.update(advisors).set({ password_hash: password }).where(eq(advisors.name, advisorName))
    return { success: true, message: '密码设置成功' }
  }

  async getAdvisorStudents(advisorName: string) {
    const advisorStudents = await this.db.query.students.findMany({
      where: eq(students.advisor_name, advisorName),
      orderBy: [asc(students.name)],
      columns: { id: true, student_no: true, name: true, grade: true, class_name: true, advisor_name: true },
    })

    if (advisorStudents.length === 0) return []

    const result: any[] = []
    for (const student of advisorStudents) {
      const records = await this.db.query.examRecords.findMany({
        where: eq(examRecords.student_id, student.id),
        orderBy: [asc(examRecords.subject_code)],
        columns: {
          subject_code: true, subject_name: true, score: true,
          pass_status: true, exam_season: true, exam_type: true,
        },
      })

      const exemptSubjects = ['F1', 'F4', 'F6']
      const passedSet = new Set(records.filter(r => r.pass_status).map(r => r.subject_code))
      const exemptCount = exemptSubjects.filter(s => !passedSet.has(s)).length

      result.push({
        student_no: student.student_no,
        name: student.name,
        grade: student.grade,
        class_name: student.class_name,
        total_passed: passedSet.size + exemptCount,
        exam_records: records.map(r => ({
          subject_code: r.subject_code,
          subject_name: r.subject_name,
          score: r.score,
          pass_status: r.pass_status,
          exam_season: r.exam_season,
          exam_type: r.exam_type,
        })),
      })
    }

    return result
  }

  async deleteStudent(studentNo: string) {
    const student = await this.db.query.students.findFirst({
      where: eq(students.student_no, studentNo),
      columns: { id: true },
    })

    if (!student) return { code: 404, msg: '学生不存在' }

    await this.db.delete(examRecords).where(eq(examRecords.student_id, student.id))
    await this.db.delete(students).where(eq(students.id, student.id))

    return { code: 200, msg: '删除成功' }
  }
}
