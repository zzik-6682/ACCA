import { Injectable } from '@nestjs/common'
import { eq, inArray } from 'drizzle-orm'
import { getDb } from '@/storage/database/drizzle-client'
import { students, examRecords } from '@/storage/database/shared/schema'

const EXEMPT_SUBJECTS = ['F1', 'F4', 'F6']

const SUBJECT_NAMES: Record<string, string> = {
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
  id: string
  student_no: string
  name: string
  grade: number
  class_name: string
  passed_subjects: string[]
  total_passed: number
  exam_records: {
    subject_code: string
    subject_name: string
    score: number | null
    pass_status: boolean
    exam_type: string
  }[]
}

export interface StatisticsData {
  grade: number
  grade_total_count: number
  uploaded_students: number
  total_records: number
  passed_records: number
  pass_rate: number
  avg_score: number
  subject_stats: { code: string; name: string; passed: number; total: number; rate: number; grade_rate: number }[]
  student_details: StudentDetail[]
}

@Injectable()
export class StatisticsService {
  private db = getDb()

  async getStatistics(grade?: string): Promise<StatisticsData> {
    console.log('获取统计数据, grade:', grade)

    const gradeNum = grade && grade !== 'all' ? parseInt(grade) : 0

    // 1. 获取学生
    let studentList = await this.db.query.students.findMany({
      columns: { id: true, student_no: true, name: true, grade: true, class_name: true },
    })

    if (grade && grade !== 'all') {
      const g = parseInt(grade)
      studentList = studentList.filter(s => s.grade === g)
    }

    const gradeTotalCount = studentList.length
    const studentIds = studentList.map(s => s.id)
    console.log('学生总数:', gradeTotalCount)

    // 2. 获取考证记录
    const records = studentIds.length > 0
      ? await this.db.query.examRecords.findMany({
          where: inArray(examRecords.student_id, studentIds),
          columns: {
            id: true, student_id: true, subject_code: true, subject_name: true,
            score: true, pass_status: true, exam_type: true,
          },
        })
      : []

    console.log('记录总数:', records.length)

    // 3. 构建学生详情
    const studentDetails: StudentDetail[] = []
    for (const student of studentList) {
      const studentRecords = records
        .filter(r => r.student_id === student.id)
        .map(r => ({
          subject_code: r.subject_code,
          subject_name: r.subject_name,
          score: r.score,
          pass_status: r.pass_status,
          exam_type: r.exam_type || 'global_exam',
        }))
      
      const exemptSet = new Set(EXEMPT_SUBJECTS)
      const passedFromRecords = studentRecords
        .filter(r => r.pass_status && !exemptSet.has(r.subject_code))
        .map(r => r.subject_code)
      const passedSubjects = [...EXEMPT_SUBJECTS, ...passedFromRecords]
      
      studentDetails.push({
        id: student.id,
        student_no: student.student_no,
        name: student.name,
        grade: student.grade,
        class_name: student.class_name,
        passed_subjects: passedSubjects,
        total_passed: passedSubjects.length,
        exam_records: studentRecords,
      })
    }

    studentDetails.sort((a, b) => b.total_passed - a.total_passed)

    // 4. 计算统计
    const totalRecords = records.length
    const passedRecords = records.filter(r => r.pass_status).length
    const passRate = totalRecords > 0 ? (passedRecords / totalRecords) * 100 : 0

    const scoredRecords = records.filter(r => r.score !== null)
    const avgScore = scoredRecords.length > 0 
      ? scoredRecords.reduce((sum, r) => sum + (r.score || 0), 0) / scoredRecords.length 
      : 0

    // 5. 按科目统计
    const subjectMap = new Map<string, { code: string; name: string; passed: number; total: number }>()
    
    for (const record of records) {
      const code = record.subject_code
      if (EXEMPT_SUBJECTS.includes(code)) continue
      
      if (!subjectMap.has(code)) {
        subjectMap.set(code, {
          code,
          name: record.subject_name,
          passed: 0,
          total: 0,
        })
      }
      const stat = subjectMap.get(code)!
      stat.total++
      if (record.pass_status) stat.passed++
    }

    const subjectStats = Array.from(subjectMap.values())
      .map(s => ({
        code: s.code,
        name: s.name,
        passed: s.passed,
        total: s.total,
        rate: s.total > 0 ? (s.passed / s.total) * 100 : 0,
        grade_rate: gradeTotalCount > 0 ? (s.passed / gradeTotalCount) * 100 : 0,
      }))
      .sort((a, b) => b.passed - a.passed)

    return {
      grade: gradeNum,
      grade_total_count: gradeTotalCount,
      uploaded_students: studentList.length,
      total_records: totalRecords,
      passed_records: passedRecords,
      pass_rate: passRate,
      avg_score: avgScore,
      subject_stats: subjectStats,
      student_details: studentDetails,
    }
  }
}
