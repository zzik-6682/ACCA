import { Injectable } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { eq, asc } from 'drizzle-orm'
import { getDb } from '@/storage/database/drizzle-client'
import { students, examRecords } from '@/storage/database/shared/schema'

@Injectable()
export class ExportService {
  private readonly SUBJECT_ORDER = [
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9',
    'SBL', 'SBR', 'AFM', 'APM', 'AAA'
  ]
  
  private readonly EXEMPT_SUBJECTS = ['F1', 'F4', 'F6']
  
  private db = getDb()

  async generateExcel(): Promise<Buffer> {
    // 查询所有学生
    const allStudents = await this.db.query.students.findMany({
      orderBy: [asc(students.grade), asc(students.student_no)],
    })

    // 查询所有通过的考试记录
    const allRecords = await this.db.query.examRecords.findMany({
      where: eq(examRecords.pass_status, true),
    })

    // 按年级分组
    const gradeGroups: Record<number, typeof allStudents> = {}
    for (const student of allStudents) {
      const grade = student.grade ?? 0
      if (!gradeGroups[grade]) gradeGroups[grade] = []
      gradeGroups[grade].push(student)
    }

    const workbook = XLSX.utils.book_new()

    const gradeNames: Record<number, string> = {
      4: '2022级',
      3: '2023级',
      2: '2024级',
      1: '2025级',
    }

    for (const [grade, gradeStudents] of Object.entries(gradeGroups)) {
      const gradeNum = parseInt(grade)
      const sheetName = gradeNames[gradeNum] || `${grade}级`
      
      const sortedStudents = [...gradeStudents].sort((a, b) => 
        a.student_no.localeCompare(b.student_no)
      )

      const sheetData: any[][] = []
      const headers = ['学号', '姓名', ...this.SUBJECT_ORDER, '总计(门)']
      sheetData.push(headers)

      for (const student of sortedStudents) {
        const row: any[] = [student.student_no, student.name]
        const studentRecords = allRecords.filter(r => r.student_id === student.id)
        
        let passedCount = 0
        
        for (const subject of this.SUBJECT_ORDER) {
          if (this.EXEMPT_SUBJECTS.includes(subject)) {
            row.push('免考')
            passedCount++
          } else {
            const record = studentRecords.find(r => r.subject_code === subject)
            if (record) {
              row.push(record.score ?? '通过')
              passedCount++
            } else {
              row.push('')
            }
          }
        }
        
        row.push(passedCount)
        sheetData.push(row)
      }

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
      worksheet['!cols'] = [
        { wch: 15 },
        { wch: 10 },
        ...this.SUBJECT_ORDER.map(() => ({ wch: 8 })),
        { wch: 10 },
      ]

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    return buffer
  }
}
