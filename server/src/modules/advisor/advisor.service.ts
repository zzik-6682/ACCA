import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class AdvisorService {
  private client = getSupabaseClient()

  async hasPassword(name: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('advisors')
      .select('password')
      .eq('name', name)
      .single()

    if (error || !data) return false
    return !!data.password
  }

  async setPassword(name: string, password: string): Promise<{ success: boolean; message: string }> {
    const { data: advisor, error } = await this.client
      .from('advisors')
      .select('id, name')
      .eq('name', name)
      .single()

    if (error || !advisor) {
      return { success: false, message: '导师不存在' }
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const { error: updateError } = await this.client
      .from('advisors')
      .update({ password: hashedPassword, updated_at: new Date().toISOString() })
      .eq('name', name)

    if (updateError) {
      return { success: false, message: '设置密码失败' }
    }

    return { success: true, message: '密码设置成功' }
  }

  async login(name: string, password: string): Promise<{
    success: boolean
    message: string
    name?: string
  }> {
    const { data: advisor, error } = await this.client
      .from('advisors')
      .select('name, password')
      .eq('name', name)
      .single()

    if (error || !advisor) {
      return { success: false, message: '导师不存在' }
    }

    if (!advisor.password) {
      return { success: false, message: '请先设置密码' }
    }

    const valid = await bcrypt.compare(password, advisor.password)
    if (!valid) {
      return { success: false, message: '密码错误' }
    }

    return { success: true, message: '登录成功', name: advisor.name }
  }

  async getMyStudents(name: string): Promise<any[]> {
    // Get assigned students
    const { data: mappings, error: mappingError } = await this.client
      .from('advisor_students')
      .select('student_no')
      .eq('advisor_name', name)

    if (mappingError || !mappings || mappings.length === 0) {
      return []
    }

    const studentNos = mappings.map(m => m.student_no)

    // Get students info (仅25级)
    const { data: students, error: studentError } = await this.client
      .from('students')
      .select('*')
      .in('student_no', studentNos)
      .eq('grade', 1)
      .order('student_no', { ascending: true })

    if (studentError || !students) return []

    // Get exam records for these students (use student_id UUID)
    const studentIds = students.map(s => s.id)
    const { data: records, error: recordError } = await this.client
      .from('exam_records')
      .select('*')
      .in('student_id', studentIds)
      .order('subject_code', { ascending: true })

    if (recordError) return []

    // Build student_no -> id map for record lookup
    const idToNo = new Map(students.map(s => [s.id, s.student_no]))

    // Group records by student_no
    const recordMap = new Map<string, any[]>()
    for (const r of (records || [])) {
      const sno = idToNo.get(r.student_id)
      if (!sno) continue
      if (!recordMap.has(sno)) recordMap.set(sno, [])
      recordMap.get(sno)!.push(r)
    }

    // Exempt subjects
    const EXEMPT = ['F1', 'F4', 'F6']

    return students.map(s => {
      const studentRecords = recordMap.get(s.student_no) || []
      const passedSubjects = new Set<string>()

      // Add exempt subjects
      EXEMPT.forEach(code => passedSubjects.add(code))

      // Add passed exam records
      for (const r of studentRecords) {
        if (r.pass_status) passedSubjects.add(r.subject_code)
      }

      return {
        student_no: s.student_no,
        name: s.name,
        grade: s.grade,
        class_name: s.class_name,
        total_passed: passedSubjects.size,
        passed_subjects: [...passedSubjects].sort(),
        exam_records: studentRecords.map(r => ({
          subject_code: r.subject_code,
          subject_name: r.subject_name,
          score: r.score,
          pass_status: r.pass_status,
          exam_type: r.exam_type,
          exam_season: r.exam_season,
        })),
      }
    })
  }
}
