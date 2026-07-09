import { useEffect, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Network } from '@/network'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface ExamRecord {
  subject_code: string
  subject_name: string
  score: number | null
  pass_status: boolean
  exam_season: string
  exam_type: string
}

interface StudentInfo {
  student_no: string
  name: string
  grade: number
  class_name: string
  total_passed: number
  exam_records: ExamRecord[]
}

export default function AdvisorDashboard() {
  const [advisorName, setAdvisorName] = useState('')
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)

  useEffect(() => {
    const name = Taro.getStorageSync('advisor_name')
    if (!name) {
      Taro.redirectTo({ url: '/pages/advisor/login/index' })
      return
    }
    setAdvisorName(name)
    fetchStudents(name)
  }, [])

  const fetchStudents = async (name: string) => {
    try {
      const res = await Network.request({
        url: `/api/exam-records/advisor/students?name=${encodeURIComponent(name)}`
      })
      if (res.data.code === 200) {
        setStudents(res.data.data || [])
      }
    } catch (e) {
      console.error('获取学生列表失败:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    Taro.removeStorageSync('advisor_name')
    Taro.redirectTo({ url: '/pages/advisor/login/index' })
  }

  const totalPassed = students.reduce((sum, s) => sum + s.total_passed, 0)
  const maxSubjects = 13 // F1-F9 + SBL + SBR + AFM + APM + AAA

  if (loading) {
    return (
      <View className="min-h-screen bg-gray-50 p-4">
        <Skeleton className="h-8 w-48 mb-4" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full mb-3 rounded-lg" />
        ))}
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 顶部 */}
      <View className="bg-white px-4 py-4 shadow-sm">
        <View className="flex items-center justify-between">
          <View>
            <Text className="block text-xl font-bold text-gray-900">{advisorName}老师</Text>
            <Text className="block text-sm text-gray-500 mt-1">
              指导 {students.length} 名学生
            </Text>
          </View>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            退出
          </Button>
        </View>
        {/* 总览卡片 */}
        <View className="flex gap-4 mt-4">
          <View className="flex-1 bg-blue-50 rounded-lg p-3">
            <Text className="block text-xs text-blue-600">学生数</Text>
            <Text className="block text-2xl font-bold text-blue-700 mt-1">{students.length}</Text>
          </View>
          <View className="flex-1 bg-emerald-50 rounded-lg p-3">
            <Text className="block text-xs text-emerald-600">通过总门数</Text>
            <Text className="block text-2xl font-bold text-emerald-700 mt-1">{totalPassed}</Text>
          </View>
          <View className="flex-1 bg-amber-50 rounded-lg p-3">
            <Text className="block text-xs text-amber-600">平均通过</Text>
            <Text className="block text-2xl font-bold text-amber-700 mt-1">
              {students.length > 0 ? (totalPassed / students.length).toFixed(1) : '0'}
            </Text>
          </View>
        </View>
      </View>

      {/* 学生列表 */}
      <ScrollView scrollY className="px-4 py-4" style={{ height: 'calc(100vh - 200px)' }}>
        {students.map((student) => (
          <Card key={student.student_no} className="mb-3">
            <CardContent className="p-4">
              <View
                className="flex items-center justify-between"
                onClick={() => setExpandedStudent(
                  expandedStudent === student.student_no ? null : student.student_no
                )}
              >
                <View className="flex-1">
                  <View className="flex items-center gap-2">
                    <Text className="block text-base font-semibold text-gray-900">
                      {student.name}
                    </Text>
                    <Badge variant="outline" className="text-xs">
                      {student.student_no}
                    </Badge>
                  </View>
                  <View className="flex items-center gap-3 mt-2">
                    <Text className="block text-sm text-gray-500">
                      {student.class_name}
                    </Text>
                    <View className="flex items-center gap-1">
                      <View className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${(student.total_passed / maxSubjects) * 100}%` }}
                        />
                      </View>
                      <Text className="text-xs text-gray-500">
                        {student.total_passed}/{maxSubjects}门
                      </Text>
                    </View>
                  </View>
                </View>
                <Text className="text-gray-400 text-lg">
                  {expandedStudent === student.student_no ? '▾' : '▸'}
                </Text>
              </View>

              {/* 成绩明细 */}
              {expandedStudent === student.student_no && (
                <View className="mt-3 pt-3 border-t border-gray-100">
                  {student.exam_records.length === 0 ? (
                    <Text className="block text-sm text-gray-400 text-center py-2">
                      暂无考试记录
                    </Text>
                  ) : (
                    <View className="space-y-2">
                      {student.exam_records.map((record, idx) => (
                        <View
                          key={idx}
                          className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                        >
                          <View>
                            <Text className="block text-sm font-medium text-gray-700">
                              {record.subject_code} {record.subject_name}
                            </Text>
                            <Text className="block text-xs text-gray-400">
                              {record.exam_season}
                            </Text>
                          </View>
                          <Badge variant={record.pass_status ? 'default' : 'destructive'}>
                            {record.score ?? '-'}分
                          </Badge>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </CardContent>
          </Card>
        ))}

        {students.length === 0 && (
          <View className="flex items-center justify-center py-20">
            <Text className="text-gray-400">暂无指导学生</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}
