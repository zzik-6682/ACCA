import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp } from 'lucide-react-taro'
import { Network } from '@/network'

interface ExamRecord {
  subject_code: string
  subject_name: string
  score: number
  pass_status: boolean
  exam_type: string
}

interface StudentInfo {
  student_no: string
  name: string
  class_name: string
  total_passed: number
  exam_records: ExamRecord[]
}

interface AdvisorResponse {
  code: number
  msg: string
  data: {
    advisor_name: string
    total_students: number
    avg_passed: number
    students: StudentInfo[]
  }
}

export default function AdvisorPage() {
  console.log('[AdvisorPage] 页面加载')
  const [step, setStep] = useState<'check' | 'set-password' | 'login' | 'dashboard'>('check')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [advisorName, setAdvisorName] = useState('')
  const [totalStudents, setTotalStudents] = useState(0)
  const [avgPassed, setAvgPassed] = useState(0)
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set())

  const toggleExpand = (studentNo: string) => {
    setExpandedStudents(prev => {
      const next = new Set(prev)
      if (next.has(studentNo)) {
        next.delete(studentNo)
      } else {
        next.add(studentNo)
      }
      return next
    })
  }

  const handleCheckPassword = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      Taro.showToast({ title: '请输入导师姓名', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      const res = await Network.request({
        url: `/api/advisor/check-password?name=${encodeURIComponent(trimmedName)}`,
        method: 'GET',
      })
      console.log('[AdvisorPage] check-password:', res.data)
      if (res.data.code === 200 && res.data.data?.has_password) {
        setStep('login')
      } else if (res.data.code === 200 && !res.data.data?.has_password) {
        setStep('set-password')
      } else {
        Taro.showToast({ title: res.data.msg || '查询失败', icon: 'none' })
      }
    } catch (err: any) {
      console.error('[AdvisorPage] check-password error:', err)
      Taro.showToast({ title: '网络错误，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleSetPassword = async () => {
    if (!password.trim() || password.trim().length < 6) {
      Taro.showToast({ title: '密码至少6位', icon: 'none' })
      return
    }
    if (password !== confirmPassword) {
      Taro.showToast({ title: '两次密码不一致', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      const res = await Network.request({
        url: '/api/advisor/set-password',
        method: 'POST',
        data: { name: name.trim(), password: password.trim() },
      })
      console.log('[AdvisorPage] set-password:', res.data)
      if (res.data.code === 200) {
        Taro.showToast({ title: '密码设置成功', icon: 'none' })
        setStep('login')
        setPassword('')
        setConfirmPassword('')
      } else {
        Taro.showToast({ title: res.data.msg || '设置失败', icon: 'none' })
      }
    } catch (err: any) {
      console.error('[AdvisorPage] set-password error:', err)
      Taro.showToast({ title: '网络错误，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!password.trim()) {
      Taro.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      const res = await Network.request({
        url: '/api/advisor/login',
        method: 'POST',
        data: { name: name.trim(), password: password.trim() },
      })
      console.log('[AdvisorPage] login:', res.data)
      if (res.data.code === 200) {
        await loadStudents()
      } else {
        Taro.showToast({ title: res.data.msg || '登录失败', icon: 'none' })
      }
    } catch (err: any) {
      console.error('[AdvisorPage] login error:', err)
      Taro.showToast({ title: '网络错误，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async () => {
    setLoading(true)
    try {
      const res = await Network.request({
        url: '/api/advisor/my-students',
        method: 'POST',
        data: { name: name.trim(), password: password.trim() },
      })
      console.log('[AdvisorPage] my-students:', res.data)
      if (res.data.code === 200) {
        const data = res.data as AdvisorResponse
        setStudents(data.data.students)
        setAdvisorName(data.data.advisor_name)
        setTotalStudents(data.data.total_students)
        setAvgPassed(data.data.avg_passed)
        setStep('dashboard')
      } else {
        Taro.showToast({ title: res.data.msg || '获取失败', icon: 'none' })
      }
    } catch (err: any) {
      console.error('[AdvisorPage] my-students error:', err)
      Taro.showToast({ title: '网络错误，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 'dashboard') {
      setStep('check')
      setName('')
      setPassword('')
      setStudents([])
    } else {
      setStep('check')
      setPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <View className="min-h-screen bg-gray-50 p-4">
      {step !== 'dashboard' && (
        <View className="flex flex-col items-center pt-16">
          <Text className="block text-2xl font-bold text-blue-900 mb-2">学业导师登录</Text>
          <Text className="block text-sm text-gray-500 mb-8">查看指导学生考证情况</Text>

          <Card className="w-full max-w-sm">
            <CardContent className="p-6">
              {step === 'check' && (
                <View>
                  <Text className="block text-sm font-medium text-gray-700 mb-2">导师姓名</Text>
                  <View className="flex flex-row items-center gap-3">
                    <Input
                      className="flex-1"
                      placeholder="请输入导师姓名"
                      value={name}
                      onInput={(e) => setName(e.detail.value)}
                    />
                    <Button onClick={handleCheckPassword} disabled={loading}>
                      <Text>{loading ? '查询中...' : '下一步'}</Text>
                    </Button>
                  </View>
                </View>
              )}

              {step === 'set-password' && (
                <View>
                  <Text className="block text-sm font-medium text-gray-700 mb-1">导师：{name}</Text>
                  <Text className="block text-xs text-gray-400 mb-4">首次登录，请设置密码</Text>
                  <View className="mb-3">
                    <Text className="block text-sm text-gray-600 mb-1">设置密码</Text>
                    <Input
                      className="w-full"
                      placeholder="至少6位"
                      password
                      value={password}
                      onInput={(e) => setPassword(e.detail.value)}
                    />
                  </View>
                  <View className="mb-4">
                    <Text className="block text-sm text-gray-600 mb-1">确认密码</Text>
                    <Input
                      className="w-full"
                      placeholder="再次输入密码"
                      password
                      value={confirmPassword}
                      onInput={(e) => setConfirmPassword(e.detail.value)}
                    />
                  </View>
                  <View className="flex flex-row gap-3">
                    <Button onClick={handleBack} variant="outline" className="flex-1">
                      <Text>返回</Text>
                    </Button>
                    <Button onClick={handleSetPassword} disabled={loading} className="flex-1">
                      <Text>{loading ? '设置中...' : '确认设置'}</Text>
                    </Button>
                  </View>
                </View>
              )}

              {step === 'login' && (
                <View>
                  <Text className="block text-sm font-medium text-gray-700 mb-1">导师：{name}</Text>
                  <Text className="block text-xs text-gray-400 mb-4">请输入密码登录</Text>
                  <View className="mb-4">
                    <Text className="block text-sm text-gray-600 mb-1">密码</Text>
                    <Input
                      className="w-full"
                      placeholder="请输入密码"
                      password
                      value={password}
                      onInput={(e) => setPassword(e.detail.value)}
                    />
                  </View>
                  <View className="flex flex-row gap-3">
                    <Button onClick={handleBack} variant="outline" className="flex-1">
                      <Text>返回</Text>
                    </Button>
                    <Button onClick={handleLogin} disabled={loading} className="flex-1">
                      <Text>{loading ? '登录中...' : '登录'}</Text>
                    </Button>
                  </View>
                </View>
              )}
            </CardContent>
          </Card>
        </View>
      )}

      {step === 'dashboard' && (
        <View>
          <View className="flex flex-row items-center gap-3 mb-4">
            <Button onClick={handleBack} variant="ghost" size="sm">
              <Text>← 退出</Text>
            </Button>
            <View className="flex-1">
              <Text className="block text-lg font-bold text-blue-900">{advisorName}老师</Text>
              <Text className="block text-xs text-gray-500">指导学生考证情况</Text>
            </View>
          </View>

          <View className="flex flex-row gap-3 mb-4">
            <Card className="flex-1">
              <CardContent className="p-3 text-center">
                <Text className="block text-2xl font-bold text-blue-900">{totalStudents}</Text>
                <Text className="block text-xs text-gray-500">学生数</Text>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="p-3 text-center">
                <Text className="block text-2xl font-bold text-blue-900">{avgPassed.toFixed(1)}</Text>
                <Text className="block text-xs text-gray-500">平均通过门数</Text>
              </CardContent>
            </Card>
          </View>

          <View className="space-y-2">
            {students.map((student) => {
              const isExpanded = expandedStudents.has(student.student_no)
              return (
                <Card key={student.student_no} className="overflow-hidden">
                  <View
                    className="flex flex-row items-center justify-between p-3 active:bg-gray-50"
                    onClick={() => toggleExpand(student.student_no)}
                  >
                    <View className="flex-1">
                      <View className="flex flex-row items-center gap-2">
                        <Text className="block text-sm font-semibold text-gray-800">{student.name}</Text>
                        <Badge variant="outline" className="text-xs">{student.class_name}</Badge>
                      </View>
                      <View className="flex flex-row items-center gap-2 mt-1">
                        <View className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <View
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(student.total_passed / 13) * 100}%` }}
                          />
                        </View>
                        <Text className="block text-xs text-gray-500">通过{student.total_passed}门</Text>
                      </View>
                    </View>
                    {isExpanded ? (
                      <ChevronUp size={18} color="#9CA3AF" />
                    ) : (
                      <ChevronDown size={18} color="#9CA3AF" />
                    )}
                  </View>

                  {isExpanded && (
                    <View className="px-3 pb-3 border-t border-gray-100">
                      <View className="mt-2 space-y-1">
                        {student.exam_records.map((record) => (
                          <View key={record.subject_code} className="flex flex-row items-center justify-between py-1">
                            <View className="flex flex-row items-center gap-2">
                              <Badge variant="outline" className="text-xs">{record.subject_code}</Badge>
                              <Text className="block text-xs text-gray-600">{record.subject_name}</Text>
                            </View>
                            <View className="flex flex-row items-center gap-2">
                              <Text className="block text-sm font-semibold text-gray-800">{record.score}</Text>
                              <Badge variant={record.pass_status ? 'secondary' : 'destructive'} className="text-xs">
                                {record.pass_status ? '通过' : '未过'}
                              </Badge>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </Card>
              )
            })}
          </View>
        </View>
      )}
    </View>
  )
}
