import { useState, useMemo } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Network } from '@/network'
import { ChevronDown, ChevronUp, GraduationCap } from 'lucide-react-taro'

const PASS_SUBJECTS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'SBL', 'SBR', 'AFM', 'APM', 'AAA']

const GRADE_MAP: Record<number, string> = { 1: '25级', 2: '24级', 3: '23级', 4: '22级' }

export default function AdvisorPage() {
  const [step, setStep] = useState<'check' | 'set-password' | 'login' | 'dashboard'>('check')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)

  const handleCheckPassword = async () => {
    if (!name.trim()) {
      Taro.showToast({ title: '请输入导师姓名', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const res = await Network.request({
        url: `/api/advisor/check-password?name=${encodeURIComponent(name.trim())}`,
        method: 'GET'
      })

      if (res.data.code === 200 && res.data.data?.has_password) {
        setStep('login')
      } else {
        setStep('set-password')
        Taro.showToast({ title: '请先设置密码', icon: 'none' })
      }
    } catch (error) {
      Taro.showToast({ title: '验证失败，请重试', icon: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSetPassword = async () => {
    if (password.length < 4) {
      Taro.showToast({ title: '密码至少4位', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const res = await Network.request({
        url: '/api/advisor/set-password',
        method: 'POST',
        data: { name: name.trim(), password }
      })

      if (res.data.code === 200) {
        Taro.showToast({ title: '密码设置成功，请登录', icon: 'success' })
        setPassword('')
        setStep('login')
      } else {
        Taro.showToast({ title: res.data.msg || '设置失败', icon: 'error' })
      }
    } catch (error) {
      Taro.showToast({ title: '设置失败，请重试', icon: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!password) {
      Taro.showToast({ title: '请输入密码', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const res = await Network.request({
        url: '/api/advisor/my-students',
        method: 'POST',
        data: { name: name.trim(), password }
      })

      if (res.data.code === 200) {
        setStudents(res.data.data || [])
        setStep('dashboard')
      } else {
        Taro.showToast({ title: res.data.msg || '登录失败', icon: 'error' })
      }
    } catch (error) {
      Taro.showToast({ title: '登录失败，请重试', icon: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (studentNo: string) => {
    setExpandedStudent(expandedStudent === studentNo ? null : studentNo)
  }

  const handleBack = () => {
    setStep('check')
    setPassword('')
    setStudents([])
  }

  // 统计
  const stats = useMemo(() => {
    const total = students.length
    const avgPassed = total > 0 ? Math.round(students.reduce((s, st) => s + (st.total_passed || 0), 0) / total) : 0
    return { total, avgPassed }
  }, [students])

  return (
    <View className="min-h-screen bg-gray-50 p-4">
      {/* 检查密码 / 设置密码 / 登录 */}
      {step !== 'dashboard' && (
        <View className="flex flex-col items-center pt-16">
          <View className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <GraduationCap size={32} color="#1E40AF" />
          </View>
          <Text className="block text-xl font-bold text-blue-900 mb-8">学业导师登录</Text>

          <Card className="w-full max-w-sm">
            <CardContent className="p-6">
              {/* 输入姓名 */}
              {step === 'check' && (
                <View>
                  <Label className="mb-2">导师姓名</Label>
                  <View className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
                    <Input
                      className="w-full bg-transparent"
                      placeholder="请输入导师姓名"
                      value={name}
                      onInput={(e) => setName(e.detail.value)}
                    />
                  </View>
                  <Button
                    className="w-full bg-blue-800 text-white rounded-lg py-3"
                    onClick={handleCheckPassword}
                    disabled={loading}
                  >
                    {loading ? '验证中...' : '下一步'}
                  </Button>
                </View>
              )}

              {/* 设置密码 */}
              {step === 'set-password' && (
                <View>
                  <Text className="block text-sm text-gray-500 mb-4">
                    导师 {name.trim()}，请设置登录密码
                  </Text>
                  <Label className="mb-2">设置密码</Label>
                  <View className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
                    <Input
                      className="w-full bg-transparent"
                      password
                      placeholder="至少4位"
                      value={password}
                      onInput={(e) => setPassword(e.detail.value)}
                    />
                  </View>
                  <Button
                    className="w-full bg-blue-800 text-white rounded-lg py-3 mb-2"
                    onClick={handleSetPassword}
                    disabled={loading}
                  >
                    {loading ? '设置中...' : '设置密码'}
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={handleBack}>
                    返回
                  </Button>
                </View>
              )}

              {/* 登录 */}
              {step === 'login' && (
                <View>
                  <Text className="block text-sm text-gray-500 mb-4">
                    导师 {name.trim()}，请输入密码
                  </Text>
                  <Label className="mb-2">密码</Label>
                  <View className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
                    <Input
                      className="w-full bg-transparent"
                      password
                      placeholder="请输入密码"
                      value={password}
                      onInput={(e) => setPassword(e.detail.value)}
                    />
                  </View>
                  <Button
                    className="w-full bg-blue-800 text-white rounded-lg py-3 mb-2"
                    onClick={handleLogin}
                    disabled={loading}
                  >
                    {loading ? '登录中...' : '登录'}
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={handleBack}>
                    返回
                  </Button>
                </View>
              )}
            </CardContent>
          </Card>
        </View>
      )}

      {/* 学生成绩面板 */}
      {step === 'dashboard' && (
        <View>
          {/* 顶部栏 */}
          <View className="flex items-center justify-between mb-4">
            <View>
              <Text className="block text-lg font-bold text-blue-900">导师面板</Text>
              <Text className="block text-sm text-gray-500">{name.trim()} · {stats.total}名学生</Text>
            </View>
            <Button variant="outline" size="sm" onClick={handleBack}>
              退出
            </Button>
          </View>

          {/* 统计卡片 */}
          <View className="flex flex-row gap-4 mb-6">
            <Card className="flex-1">
              <CardContent className="p-4 text-center">
                <Text className="block text-2xl font-bold text-blue-800">{stats.total}</Text>
                <Text className="block text-xs text-gray-500">学生数</Text>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="p-4 text-center">
                <Text className="block text-2xl font-bold text-emerald-600">{stats.avgPassed}</Text>
                <Text className="block text-xs text-gray-500">平均通过门数</Text>
              </CardContent>
            </Card>
          </View>

          {/* 学生列表 */}
          <View className="flex flex-col gap-3">
            {students.map((student) => {
              const isExpanded = expandedStudent === student.student_no
              const passedCount = student.total_passed || 0
              const totalCount = PASS_SUBJECTS.length
              const rate = Math.round((passedCount / totalCount) * 100)

              return (
                <Card key={student.student_no}>
                  <CardContent className="p-4">
                    {/* 学生基本信息 */}
                    <View
                      className="flex flex-row items-center justify-between"
                      onClick={() => toggleExpand(student.student_no)}
                    >
                      <View className="flex-1">
                        <View className="flex flex-row items-center gap-2 mb-1">
                          <Text className="block text-base font-semibold">{student.name}</Text>
                          <Badge variant="secondary" className="text-xs">
                            {GRADE_MAP[student.grade] || `${student.grade}级`}
                          </Badge>
                        </View>
                        <Text className="block text-xs text-gray-500">
                          {student.student_no} · {student.class_name}
                        </Text>
                      </View>
                      <View className="flex items-center gap-2">
                        <Text className="text-sm font-bold text-blue-800">
                          {passedCount}/{totalCount}
                        </Text>
                        {isExpanded ? (
                          <ChevronUp size={16} color="#6B7280" />
                        ) : (
                          <ChevronDown size={16} color="#6B7280" />
                        )}
                      </View>
                    </View>

                    {/* 进度条 */}
                    <View className="w-full h-2 bg-gray-100 rounded-full mt-3 mb-1">
                      <View
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${rate}%` }}
                      />
                    </View>

                    {/* 展开后显示成绩明细 */}
                    {isExpanded && (
                      <View className="mt-4 pt-4 border-t border-gray-100">
                        <View className="flex flex-row flex-wrap gap-2">
                          {PASS_SUBJECTS.map((subj) => {
                            const record = student.exam_records?.find((r: any) => r.subject_code === subj)
                            const passed = record ? record.score >= 50 : false
                            const exempt = !record && ['F1', 'F4', 'F6'].includes(subj)
                            return (
                              <View
                                key={subj}
                                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                                  passed
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : exempt
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-gray-50 text-gray-400 border border-gray-200'
                                }`}
                              >
                                <Text className="block">
                                  {subj}
                                  {passed ? ` ${record.score}` : exempt ? ' 免考' : ''}
                                </Text>
                              </View>
                            )
                          })}
                        </View>
                      </View>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </View>
        </View>
      )}
    </View>
  )
}
