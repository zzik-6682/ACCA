import { Injectable } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { getSupabaseClient } from '@/storage/database/supabase-client'

@Injectable()
export class ExportService {
  // ACCA 科目顺序
  private readonly SUBJECT_ORDER = [
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9',
    'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'
  ]
  
  // 免考科目（默认通过）
  private readonly EXEMPT_SUBJECTS = ['F1', 'F4', 'F6']
  
  private client = getSupabaseClient()

  async generateExcel(): Promise<Buffer> {
    // 查询所有学生
    const { data: students, error: studentError } = await this.client
      .from('students')
      .select('*')
      .order('grade', { ascending: true })
      .order('student_no', { ascending: true })

    if (studentError) {
      console.error('查询学生失败:', studentError)
      throw new Error('查询学生失败')
    }

    // 查询所有通过的考试记录
    const { data: records, error: recordError } = await this.client
      .from('exam_records')
      .select('*')
      .eq('pass_status', true)

    if (recordError) {
      console.error('查询考试记录失败:', recordError)
      throw new Error('查询考试记录失败')
    }

    // 按年级分组学生
    const gradeGroups: Record<number, any[]> = {}
    for (const student of students || []) {
      const grade = student.grade ?? 0
      if (!gradeGroups[grade]) {
        gradeGroups[grade] = []
      }
      gradeGroups[grade].push(student)
    }

    // 创建 workbook
    const workbook = XLSX.utils.book_new()

    // 年级名称映射
    const gradeNames: Record<number, string> = {
      4: '2022级',
      3: '2023级',
      2: '2024级',
      1: '2025级'
    }

    // 每个年级创建一个 sheet
    for (const [grade, gradeStudents] of Object.entries(gradeGroups)) {
      const gradeNum = parseInt(grade)
      const sheetName = gradeNames[gradeNum] || `${grade}级`
      
      // 按学号排序
      const sortedStudents = [...gradeStudents].sort((a, b) => 
        a.student_no.localeCompare(b.student_no)
      )

      // 构建 sheet 数据
      const sheetData: any[][] = []
      
      // 表头：学号、姓名、各科目、总计
      const headers = ['学号', '姓名', ...this.SUBJECT_ORDER, '总计(门)']
      sheetData.push(headers)

      // 每个学生的数据行
      for (const student of sortedStudents) {
        const row: any[] = [student.student_no, student.name]
        
        // 获取该学生的考试记录
        const studentRecords = (records || []).filter(r => r.student_id === student.id)
        
        // 统计通过科目数
        let passedCount = 0
        
        // 各科目分数
        for (const subject of this.SUBJECT_ORDER) {
          if (this.EXEMPT_SUBJECTS.includes(subject)) {
            // 免考科目：显示"免考"
            row.push('免考')
            passedCount++
          } else {
            // 查找该科目的考试记录
            const record = studentRecords.find(r => r.subject_code === subject)
            if (record) {
              row.push(record.score ?? '通过')
              passedCount++
            } else {
              row.push('')
            }
          }
        }
        
        // 总计
        row.push(passedCount)
        sheetData.push(row)
      }

      // 创建 sheet
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
      
      // 设置列宽
      worksheet['!cols'] = [
        { wch: 15 }, // 学号
        { wch: 10 }, // 姓名
        ...this.SUBJECT_ORDER.map(() => ({ wch: 8 })), // 各科目
        { wch: 10 }  // 总计
      ]

      // 添加到 workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    }

    // 生成 Excel Buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    return buffer
  }
}