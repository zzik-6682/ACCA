import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

// 班级人数基数（用于计算通过率）
const GRADE_TOTAL_COUNT = {
  1: 31,  // 25级（大一）31人
  2: 28,  // 24级（大二）28人
  3: 17,  // 23级（大三）17人
  4: 14,  // 22级（大四）14人
}

// 免考科目（默认全部通过）
const EXEMPT_SUBJECTS = ['F1', 'F4', 'F6']

// 科目名称映射
const SUBJECT_NAMES = {
  'F1': '商业与技术 Business and Technology (BT)',
  'F2': '管理会计 Management Accounting (MA)',
  'F3': '财务会计 Financial Accounting (FA)',
  'F4': '公司法与商法 Corporate and Business Law (LW)',
  'F5': '业绩管理 Performance Management (PM)',
  'F6': '税务 Taxation (TX)',
  'F7': '财务报告 Financial Reporting (FR)',
  'F8': '审计与认证业务 Audit and Assurance (AA)',
  'F9': '财务管理 Financial Management (FM)',
}

export interface StudentDetail {
  id: number
  student_no: string
  name: string
  grade: number
  class_name: string
  passed_subjects: string[]
  total_passed: number
  exam_records: {
    subject_code: string
    subject_name: string
    score: number
    pass_status: boolean
    exam_type: string
  }[]
}

export interface StatisticsData {
  grade: number
  grade_total_count: number  // 班级总人数（基数）
  uploaded_students: number  // 已上传成绩的学生数
  total_records: number
  passed_records: number
  pass_rate: number
  avg_score: number
  subject_stats: { code: string; name: string; passed: number; total: number; rate: number; grade_rate: number }[]
  student_details: StudentDetail[]
}

@Injectable()
export class StatisticsService {
  private client = getSupabaseClient()

  async getStatistics(grade?: string): Promise<StatisticsData> {
    console.log('获取统计数据, grade:', grade)

    const gradeNum = grade && grade !== 'all' ? parseInt(grade) : 0
    const gradeTotalCount = gradeNum > 0 ? (GRADE_TOTAL_COUNT[gradeNum] || 0) : 0

    // 1. 获取学生信息（按年级筛选）
    let studentQuery = this.client
      .from('students')
      .select('id, student_no, name, grade, class_name')

    if (grade && grade !== 'all') {
      studentQuery = studentQuery.eq('grade', parseInt(grade))
    }

    const { data: students, error: studentError } = await studentQuery

    if (studentError) {
      console.error('查询学生失败:', studentError)
      throw new Error(`查询学生失败: ${studentError.message}`)
    }

    const studentIds = (students || []).map(s => s.id)
    console.log('学生总数:', students?.length || 0)

    // 2. 获取考证记录（包含 exam_type）
    let recordQuery = this.client
      .from('exam_records')
      .select('id, student_id, subject_code, subject_name, score, pass_status, exam_type')

    if (studentIds.length > 0) {
      recordQuery = recordQuery.in('student_id', studentIds)
    }

    const { data: records, error: recordError } = await recordQuery

    if (recordError) {
      console.error('查询记录失败:', recordError)
      throw new Error(`查询记录失败: ${recordError.message}`)
    }

    console.log('记录总数:', records?.length || 0)

    // 3. 构建学生详情列表（免考科目默认加入通过列表）
    const studentDetails: StudentDetail[] = []
    for (const student of (students || [])) {
      const studentRecords = (records || [])
        .filter(r => r.student_id === student.id)
        .map(r => ({
          subject_code: r.subject_code,
          subject_name: r.subject_name,
          score: r.score,
          pass_status: r.pass_status,
          exam_type: r.exam_type || 'global_exam'
        }))
      
      // 免考科目默认通过（不需要上传成绩）
      const passedSubjects = [...EXEMPT_SUBJECTS, ...studentRecords
        .filter(r => r.pass_status)
        .map(r => r.subject_code)]
      
      studentDetails.push({
        id: student.id,
        student_no: student.student_no,
        name: student.name,
        grade: student.grade,
        class_name: student.class_name,
        passed_subjects: passedSubjects,
        total_passed: passedSubjects.length,
        exam_records: studentRecords
      })
    }

    // 按通过科目数排序（从多到少）
    studentDetails.sort((a, b) => b.total_passed - a.total_passed)

    // 4. 计算统计数据
    const totalRecords = records?.length || 0
    const passedRecords = (records || []).filter(r => r.pass_status).length
    const passRate = totalRecords > 0 ? (passedRecords / totalRecords) * 100 : 0

    // 计算平均分
    const scoredRecords = (records || []).filter(r => r.score !== null)
    const avgScore = scoredRecords.length > 0 
      ? scoredRecords.reduce((sum, r) => sum + (r.score || 0), 0) / scoredRecords.length 
      : 0

    // 5. 按科目统计（跳过免考科目 F1/F4/F6，免考科目在后面统一处理）
    const subjectMap = new Map<string, { code: string; name: string; passed: number; total: number }>()
    
    for (const record of (records || [])) {
      const code = record.subject_code
      // 跳过免考科目，避免重复统计
      if (EXEMPT_SUBJECTS.includes(code)) continue
      
      if (!subjectMap.has(code)) {
        subjectMap.set(code, {
          code: code,
          name: record.subject_name,
          passed: 0,
          total: 0
        })
      }
      const stat = subjectMap.get(code)!
      stat.total++
      if (record.pass_status) {
        stat.passed++
      }
    }

    const subjectStats = Array.from(subjectMap.values())
      .map(s => ({
        code: s.code,
        name: s.name,
        passed: s.passed,
        total: s.total,
        rate: s.total > 0 ? (s.passed / s.total) * 100 : 0,
        // 使用班级人数基数计算该科目的年级通过率
        grade_rate: gradeTotalCount > 0 ? (s.passed / gradeTotalCount) * 100 : 0
      }))
      .sort((a, b) => b.passed - a.passed) // 按通过人数排序

    // 6. 免考科目（F1, F4, F6）默认全部通过
    for (const exemptCode of EXEMPT_SUBJECTS) {
      subjectStats.unshift({
        code: exemptCode,
        name: SUBJECT_NAMES[exemptCode] || exemptCode,
        passed: gradeTotalCount,  // 默认全班通过
        total: gradeTotalCount,
        rate: 100,  // 100% 通过
        grade_rate: 100  // 100% 班级通过率
      })
    }

    return {
      grade: gradeNum,
      grade_total_count: gradeTotalCount,
      uploaded_students: students?.length || 0,
      total_records: totalRecords,
      passed_records: passedRecords,
      pass_rate: passRate,
      avg_score: avgScore,
      subject_stats: subjectStats,
      student_details: studentDetails
    }
  }
}