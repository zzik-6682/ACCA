import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp } from 'lucide-react-taro'
import { Network } from '@/network'

interface StudentDetail {
  student_no: string
  name: string
  grade: number
  class_name: string
  total_passed: number
  passed_count: number
  exam_records: Array<{
    subject_code: string
    subject_name: string
    score: number
    pass_status: boolean
    exam_type: string
    exam_season: string
  }>
}

export default function AdvisorPage() {
  const [step, setStep] = useState<'check' | 'set-password' | 'login' | 'dashboard'>('check')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [students, setStudents] = useState<StudentDetail[]>([])
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    console.log('AdvisorPage mounted')
  }, [])

  // 检查是否已设置密码
  const checkPassword = async () => {
    if (!name.trim()) {
      Taro.showToast({ title: '请输入导师姓名', icon: 'none' })
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await Network.request({
        url: `/api/advisor/check-password?name=${encodeURIComponent(name.trim())}`,
        method: 'GET'
      })
      console.log('checkPassword res:', JSON.stringify(res.data))
      if (res.data.code === 200 && res.data.data?.has_password) {
        setStep('login')
      } else if (res.data.code === 200) {
        setStep('set-password')
      } else {
        setError(res.data.msg || '查询失败')
      }
    } catch (e: any) {
      console.error('checkPassword error:', e)
      setError('网络错误，请重试')
    }
    setLoading(false)
  }

  // 设置密码
  const setAdvisorPassword = async () => {
    if (!password.trim()) {
      Taro.showToast({ title: '请设置密码', icon: 'none' })
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await Network.request({
        url: '/api/advisor/set-password',
        method: 'POST',
        data: { name: name.trim(), password: password.trim() }
      })
      console.log('setPassword res:', JSON.stringify(res.data))
      if (res.data.code === 200) {
        Taro.showToast({ title: '密码设置成功', icon: 'none' })
        setStep('login')
        setPassword('')
      } else {
        setError(res.data.msg || '设置失败')
      }
    } catch (e: any) {
      console.error('setPassword error:', e)
      setError('网络错误，请重试')
    }
    setLoading(false)
  }

  // 登录
  const login = async () => {
    if (!password.trim()) {
      Taro.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await Network.request({
        url: '/api/advisor/my-students',
        method: 'POST',
        data: { name: name.trim(), password: password.trim() }
      })
      console.log('login res:', JSON.stringify(res.data))
      if (res.data.code === 200) {
        setStudents(res.data.data || [])
        setStep('dashboard')
      } else {
        setError(res.data.msg || '登录失败')
      }
    } catch (e: any) {
      console.error('login error:', e)
      setError('网络错误，请重试')
    }
    setLoading(false)
  }

  // 登出
  const logout = () => {
    setStep('check')
    setName('')
    setPassword('')
    setStudents([])
    setExpandedStudent(null)
    setError('')
  }

  const toggleExpand = (studentNo: string) => {
    setExpandedStudent(expandedStudent === studentNo ? null : studentNo)
  }

  const PASS_SUBJECTS = ['F1', 'F4', 'F6']

  return (
    <View className="min-h-screen bg-gray-50 p-4">
      {step !== 'dashboard' && (
        <View className="flex flex-col items-center pt-16">
          <Text className="block text-xl font-bold text-center mb-2">学业导师</Text>
          <Text className="block text-sm text-gray-500 mb-8 text-center">查看指导学生考证情况</Text>

          <Card className="w-full max-w-sm">
            <CardContent className="p-6">
              {step === 'check' && (
                <View>
                  <Text className="block text-sm font-medium mb-2">导师姓名</Text>
                  <Input
                    className="w-full"
                    placeholder="请输入导师姓名"
                    value={name}
                    onInput={(e) => setName(e.detail.value)}
                  />
                  {error ? <Text className="block text-red-500 text-xs mt-2">{error}</Text> : null}
                  <Button
                    className="w-full mt-4"
                    onClick={checkPassword}
                    disabled={loading}
                  >
                    <Text>{loading ? '查询中...' : '下一步'}</Text>
                  </Button>
                </View>
              )}

              {step === 'set-password' && (
                <View>
                  <Text className="block text-sm text-gray-500 mb-4">首次使用，请设置密码</Text>
                  <Text className="block text-sm font-medium mb-2">设置密码</Text>
                  <Input
                    className="w-full"
                    placeholder="请设置登录密码"
                    password
                    value={password}
                    onInput={(e) => setPassword(e.detail.value)}
                  />
                  {error ? <Text className="block text-red-500 text-xs mt-2">{error}</Text> : null}
                  <View className="flex flex-row gap-2 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setStep('check'); setError('') }}
                    >
                      <Text>返回</Text>
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={setAdvisorPassword}
                      disabled={loading}
                    >
                      <Text>{loading ? '设置中...' : '确认'}</Text>
                    </Button>
                  </View>
                </View>
              )}

              {step === 'login' && (
                <View>
                  <Text className="block text-sm text-gray-500 mb-4">
                    {name}，请输入密码登录
                  </Text>
                  <Text className="block text-sm font-medium mb-2">密码</Text>
                  <Input
                    className="w-full"
                    placeholder="请输入登录密码"
                    password
                    value={password}
                    onInput={(e) => setPassword(e.detail.value)}
                  />
                  {error ? <Text className="block text-red-500 text-xs mt-2">{error}</Text> : null}
                  <View className="flex flex-row gap-2 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setStep('check'); setError('') }}
                    >
                      <Text>返回</Text>
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={login}
                      disabled={loading}
                    >
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
          <View className="flex flex-row items-center justify-between mb-4">
            <View>
              <Text className="block text-lg font-bold">{name}</Text>
              <Text className="block text-xs text-gray-500">
                指导 {students.length} 名学生（25级）
              </Text>
            </View>
            <Button variant="outline" size="sm" onClick={logout}>
              <Text>退出</Text>
            </Button>
          </View>

          <View className="grid grid-cols-2 gap-3 mb-4">
            <Card>
              <CardContent className="p-4">
                <Text className="block text-xs text-gray-500">指导人数</Text>
                <Text className="block text-2xl font-bold text-blue-600">{students.length}</Text>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Text className="block text-xs text-gray-500">平均通过</Text>
                <Text className="block text-2xl font-bold text-emerald-600">
                  {students.length > 0
                    ? (students.reduce((s, stu) => s + stu.total_passed, 0) / students.length).toFixed(1)
                    : 0}
                </Text>
              </CardContent>
            </Card>
          </View>

          {students.map((student) => (
            <Card key={student.student_no} className="mb-3">
              <CardContent className="p-4">
                <View
                  className="flex flex-row items-center justify-between"
                  onClick={() => toggleExpand(student.student_no)}
                >
                  <View className="flex-1">
                    <Text className="block text-base font-semibold">{student.name}</Text>
                    <Text className="block text-xs text-gray-500">{student.student_no}</Text>
                  </View>
                  <View className="flex flex-row items-center gap-2">
                    <Badge variant={student.total_passed >= 3 ? 'default' : 'secondary'}>
                      <Text>通过 {student.total_passed} 门</Text>
                    </Badge>
                    {expandedStudent === student.student_no ? (
                      <ChevronUp size={16} color="#9CA3AF" />
                    ) : (
                      <ChevronDown size={16} color="#9CA3AF" />
                    )}
                  </View>
                </View>

                {expandedStudent === student.student_no && (
                  <View className="mt-3 pt-3 border-t border-gray-100">
                    <View className="flex flex-row flex-wrap gap-2 mb-2">
                      {student.exam_records.map((record) => (
                        <Badge
                          key={record.subject_code}
                          variant={record.pass_status ? 'default' : 'secondary'}
                        >
                          <Text className={record.pass_status ? 'text-emerald-600' : 'text-amber-500'}>
                            {record.subject_code}: {record.score}
                          </Text>
                        </Badge>
                      ))}
                      {PASS_SUBJECTS.map((code) => {
                        const hasRecord = student.exam_records.some(r => r.subject_code === code)
                        if (hasRecord) return null
                        return (
                          <Badge key={code} variant="outline">
                            <Text className="text-blue-500">{code}: 免考</Text>
                          </Badge>
                        )
                      })}
                    </View>
                  </View>
                )}
              </CardContent>
            </Card>
          ))}

          {students.length === 0 && (
            <View className="flex items-center justify-center py-16">
              <Text className="block text-gray-400 text-sm">暂无指导学生数据</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}
