import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Network } from '@/network'
import { Lock, User, Key, Check, X } from 'lucide-react-taro'

// 通过科目列表（包括免考）
const PASS_SUBJECTS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']

export default function MyPage() {
  const [step, setStep] = useState<'check' | 'set-password' | 'login' | 'records'>('check')
  const [studentNo, setStudentNo] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<{ name: string; grade: number; class_name: string } | null>(null)
  const [records, setRecords] = useState<any[]>([])

  // 检查是否已设置密码
  const handleCheckPassword = async () => {
    if (!studentNo.trim()) {
      Taro.showToast({ title: '请输入学号', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const res = await Network.request({
        url: '/api/exam-records/check-password',
        method: 'GET',
        data: { student_no: studentNo.trim() }
      })
      console.log('检查密码状态:', res.data)

      if (res.data.code === 200 && res.data.data?.has_password) {
        // 已设置密码，跳转登录
        setStep('login')
        Taro.showToast({ title: '请输入密码登录', icon: 'none' })
      } else {
        // 未设置密码，跳转设置密码
        setStep('set-password')
        Taro.showToast({ title: '请先设置密码', icon: 'none' })
      }
    } catch (error) {
      console.error('检查失败:', error)
      Taro.showToast({ title: '查询失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  // 设置密码
  const handleSetPassword = async () => {
    if (!studentNo.trim() || !name.trim() || !password.trim()) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }

    if (password.length < 4) {
      Taro.showToast({ title: '密码至少4位', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const res = await Network.request({
        url: '/api/exam-records/set-password',
        method: 'POST',
        data: {
          student_no: studentNo.trim(),
          name: name.trim(),
          password: password.trim()
        }
      })
      console.log('设置密码结果:', res.data)

      if (res.data.code === 200) {
        Taro.showToast({ title: '密码设置成功', icon: 'success' })
        // 设置成功后直接登录
        handleLogin()
      } else {
        Taro.showToast({ title: res.data.msg || '设置失败', icon: 'none' })
      }
    } catch (error) {
      console.error('设置密码失败:', error)
      Taro.showToast({ title: '设置失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  // 登录
  const handleLogin = async () => {
    if (!studentNo.trim() || !password.trim()) {
      Taro.showToast({ title: '请输入学号和密码', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const res = await Network.request({
        url: '/api/exam-records/login',
        method: 'POST',
        data: {
          student_no: studentNo.trim(),
          password: password.trim()
        }
      })
      console.log('登录结果:', res.data)

      if (res.data.code === 200) {
        Taro.showToast({ title: '登录成功', icon: 'success' })
        setUserInfo(res.data.data)
        // 登录成功后查询记录
        fetchRecords()
      } else {
        Taro.showToast({ title: res.data.msg || '登录失败', icon: 'none' })
      }
    } catch (error) {
      console.error('登录失败:', error)
      Taro.showToast({ title: '登录失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  // 查询考试记录
  const fetchRecords = async () => {
    setLoading(true)
    try {
      const res = await Network.request({
        url: '/api/exam-records/my-records',
        method: 'POST',
        data: {
          student_no: studentNo.trim(),
          password: password.trim()
        }
      })
      console.log('查询记录:', res.data)

      if (res.data.code === 200) {
        setRecords(res.data.data || [])
        setStep('records')
      } else {
        Taro.showToast({ title: res.data.msg || '查询失败', icon: 'none' })
      }
    } catch (error) {
      console.error('查询失败:', error)
      Taro.showToast({ title: '查询失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  // 退出登录
  const handleLogout = () => {
    setStep('check')
    setStudentNo('')
    setName('')
    setPassword('')
    setUserInfo(null)
    setRecords([])
    Taro.showToast({ title: '已退出登录', icon: 'none' })
  }

  // 计算通过科目（包括免考科目）
  const getPassedSubjects = () => {
    const examPassed = records.filter(r => r.pass_status).map(r => r.subject_code)
    // 添加免考科目
    const exemptSubjects = ['F1', 'F4', 'F6']
    const allPassed = [...new Set([...examPassed, ...exemptSubjects])]
    return allPassed.sort((a, b) => {
      const order = PASS_SUBJECTS.indexOf(a) - PASS_SUBJECTS.indexOf(b)
      return order
    })
  }

  // 渲染检查学号界面
  if (step === 'check') {
    return (
      <View className="flex flex-col min-h-screen bg-gray-50 p-4">
        <View className="flex items-center justify-center py-8">
          <Lock size={48} color="#1E40AF" />
        </View>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">查看我的考试记录</CardTitle>
            <CardDescription className="text-sm">请输入学号验证身份</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <View className="bg-gray-50 rounded-xl px-4 py-3">
              <Input 
                className="w-full bg-transparent" 
                placeholder="请输入学号" 
                value={studentNo}
                onInput={(e) => setStudentNo(e.detail.value)}
              />
            </View>
            
            <Button 
              className="w-full" 
              onClick={handleCheckPassword}
              disabled={loading}
            >
              <Text className="text-white">{loading ? '验证中...' : '下一步'}</Text>
            </Button>
            
            <View className="bg-blue-50 rounded-lg p-3">
              <Text className="block text-sm text-blue-700">
                首次使用需要设置密码保护隐私
              </Text>
            </View>
          </CardContent>
        </Card>
      </View>
    )
  }

  // 渲染设置密码界面
  if (step === 'set-password') {
    return (
      <View className="flex flex-col min-h-screen bg-gray-50 p-4">
        <View className="flex items-center justify-center py-8">
          <Key size={48} color="#1E40AF" />
        </View>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">设置密码</CardTitle>
            <CardDescription className="text-sm">首次使用请设置密码保护隐私</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <View>
              <Label className="text-sm mb-2">学号</Label>
              <View className="bg-gray-100 rounded-xl px-4 py-3">
                <Text className="block text-gray-500">{studentNo}</Text>
              </View>
            </View>
            
            <View>
              <Label className="text-sm mb-2">姓名</Label>
              <View className="bg-gray-50 rounded-xl px-4 py-3">
                <Input 
                  className="w-full bg-transparent" 
                  placeholder="请输入姓名验证身份" 
                  value={name}
                  onInput={(e) => setName(e.detail.value)}
                />
              </View>
            </View>
            
            <View>
              <Label className="text-sm mb-2">设置密码</Label>
              <View className="bg-gray-50 rounded-xl px-4 py-3">
                <Input 
                  className="w-full bg-transparent" 
                  placeholder="请设置密码（至少4位）" 
                  value={password}
                  onInput={(e) => setPassword(e.detail.value)}
                />
              </View>
            </View>
            
            <Button 
              className="w-full" 
              onClick={handleSetPassword}
              disabled={loading}
            >
              <Text className="text-white">{loading ? '设置中...' : '确认设置'}</Text>
            </Button>
            
            <Button 
              className="w-full bg-gray-200" 
              onClick={() => setStep('check')}
            >
              <Text className="text-gray-700">返回</Text>
            </Button>
            
            <View className="bg-yellow-50 rounded-lg p-3">
              <Text className="block text-sm text-yellow-700">
                姓名需与系统记录一致才能设置密码
              </Text>
            </View>
          </CardContent>
        </Card>
      </View>
    )
  }

  // 渲染登录界面
  if (step === 'login') {
    return (
      <View className="flex flex-col min-h-screen bg-gray-50 p-4">
        <View className="flex items-center justify-center py-8">
          <User size={48} color="#1E40AF" />
        </View>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">登录查看记录</CardTitle>
            <CardDescription className="text-sm">请输入密码验证身份</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <View>
              <Label className="text-sm mb-2">学号</Label>
              <View className="bg-gray-100 rounded-xl px-4 py-3">
                <Text className="block text-gray-500">{studentNo}</Text>
              </View>
            </View>
            
            <View>
              <Label className="text-sm mb-2">密码</Label>
              <View className="bg-gray-50 rounded-xl px-4 py-3">
                <Input 
                  className="w-full bg-transparent" 
                  placeholder="请输入密码" 
                  value={password}
                  onInput={(e) => setPassword(e.detail.value)}
                />
              </View>
            </View>
            
            <Button 
              className="w-full" 
              onClick={handleLogin}
              disabled={loading}
            >
              <Text className="text-white">{loading ? '登录中...' : '登录'}</Text>
            </Button>
            
            <Button 
              className="w-full bg-gray-200" 
              onClick={() => setStep('check')}
            >
              <Text className="text-gray-700">更换学号</Text>
            </Button>
          </CardContent>
        </Card>
      </View>
    )
  }

  // 渲染考试记录界面
  const passedSubjects = getPassedSubjects()
  
  return (
    <View className="flex flex-col min-h-screen bg-gray-50 p-4 pb-8">
      {/* 用户信息 */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <View className="flex items-center justify-between">
            <View className="flex items-center gap-3">
              <User size={24} color="#1E40AF" />
              <View>
                <Text className="block text-lg font-semibold">{userInfo?.name}</Text>
                <Text className="block text-sm text-gray-500">{userInfo?.class_name}</Text>
              </View>
            </View>
            <Button size="sm" className="bg-gray-200" onClick={handleLogout}>
              <Text className="text-sm text-gray-700">退出</Text>
            </Button>
          </View>
        </CardContent>
      </Card>

      {/* 通过科目统计 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">通过科目</CardTitle>
          <CardDescription className="text-sm">
            已通过 {passedSubjects.length} 门（含免考 F1/F4/F6）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <View className="flex flex-wrap gap-2">
            {passedSubjects.map(code => (
              <Badge 
                key={code} 
                className={['F1', 'F4', 'F6'].includes(code) ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}
              >
                {code}
              </Badge>
            ))}
            {passedSubjects.length === 0 && (
              <Text className="block text-gray-500">暂无通过科目</Text>
            )}
          </View>
        </CardContent>
      </Card>

      {/* 免考科目提示 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">免考科目（默认通过）</CardTitle>
          <CardDescription className="text-sm">以下科目无需上传成绩，默认全部通过</CardDescription>
        </CardHeader>
        <CardContent>
          <View className="flex flex-row gap-2 flex-wrap">
            <Badge className="bg-green-100 text-green-700 px-3 py-1">F1 商业与技术 ✓</Badge>
            <Badge className="bg-green-100 text-green-700 px-3 py-1">F4 公司法与商法 ✓</Badge>
            <Badge className="bg-green-100 text-green-700 px-3 py-1">F6 税法 ✓</Badge>
          </View>
        </CardContent>
      </Card>

      {/* 考试记录详情 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">全球考科目记录</CardTitle>
          <CardDescription className="text-sm">
            共 {records.length} 条考试记录（不含免考科目）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <View className="flex items-center justify-center py-8">
              <Text className="block text-gray-500">暂无考试记录</Text>
            </View>
          ) : (
            <View className="space-y-4">
              {records.map(record => (
                <View key={record.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  {/* 科目信息 */}
                  <View className="flex items-center justify-between mb-3">
                    <View className="flex items-center gap-2">
                      <Badge className={record.exam_type === 'final_exam' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                        {record.exam_type === 'final_exam' ? '期末考' : '全球考'}
                      </Badge>
                      <Text className="block font-semibold text-lg">{record.subject_code}</Text>
                    </View>
                    {record.pass_status ? (
                      <View className="flex items-center gap-1">
                        <Check size={20} color="#22C55E" />
                        <Text className="text-green-600 font-medium">通过</Text>
                      </View>
                    ) : (
                      <View className="flex items-center gap-1">
                        <X size={20} color="#EF4444" />
                        <Text className="text-red-600 font-medium">未通过</Text>
                      </View>
                    )}
                  </View>
                  
                  {/* 科目名称 */}
                  <Text className="block text-sm text-gray-700 mb-3">{record.subject_name}</Text>
                  
                  {/* 考试详情 */}
                  <View className="bg-gray-50 rounded-lg p-3 mb-3">
                    <View className="flex flex-row justify-between mb-2">
                      <Text className="block text-sm text-gray-500">考试分数</Text>
                      <Text className="block text-sm font-semibold">{record.score || '-'}分</Text>
                    </View>
                    <View className="flex flex-row justify-between mb-2">
                      <Text className="block text-sm text-gray-500">考季</Text>
                      <Text className="block text-sm font-semibold">{record.exam_season}</Text>
                    </View>
                    <View className="flex flex-row justify-between">
                      <Text className="block text-sm text-gray-500">考试类型</Text>
                      <Text className="block text-sm font-semibold">
                        {record.exam_type === 'final_exam' ? '期末考试' : '全球考试'}
                      </Text>
                    </View>
                  </View>
                  
                  {/* 成绩截图 */}
                  {record.screenshot_url && (
                    <View className="mb-3">
                      <Text className="block text-sm text-gray-500 mb-2">成绩截图</Text>
                      <View 
                        className="bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => {
                          Taro.previewImage({
                            urls: [record.screenshot_url],
                            current: record.screenshot_url
                          })
                        }}
                      >
                        <Image 
                          src={record.screenshot_url} 
                          className="w-full h-32 object-cover"
                          mode="aspectFill"
                        />
                        <View className="absolute bottom-2 right-2 bg-black bg-opacity-50 rounded px-2 py-1">
                          <Text className="text-white text-xs">点击查看大图</Text>
                        </View>
                      </View>
                    </View>
                  )}
                  
                  {/* 备注 */}
                  {record.notes && (
                    <View className="bg-yellow-50 rounded-lg p-2">
                      <Text className="block text-xs text-yellow-700">备注: {record.notes}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </CardContent>
      </Card>
    </View>
  )
}