import { View, Text } from '@tarojs/components'
import { Input } from '@/components/ui/input'
import Taro from '@tarojs/taro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, Users, Lock, GraduationCap } from 'lucide-react-taro'
import { useState } from 'react'

const ADMIN_PASSWORD = 'acca2024' // 管理员密码

const IndexPage = () => {
  const [showAdminDialog, setShowAdminDialog] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  const handleUpload = () => {
    Taro.switchTab({ url: '/pages/upload/index' })
  }

  const handleMyRecords = () => {
    Taro.switchTab({ url: '/pages/my/index' })
  }

  const handleAdvisor = () => {
    Taro.navigateTo({ url: '/pages/advisor/index' })
  }

  const handleAdminClick = () => {
    setShowAdminDialog(true)
    setAdminPassword('')
    setPasswordError(false)
  }

  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setShowAdminDialog(false)
      Taro.navigateTo({ url: '/pages/statistics/index' })
    } else {
      setPasswordError(true)
      Taro.showToast({ title: '密码错误', icon: 'error' })
    }
  }

  const handleCancel = () => {
    setShowAdminDialog(false)
    setAdminPassword('')
    setPasswordError(false)
  }

  return (
    <View className="w-full min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <View className="mb-6">
        <Text className="block text-xl font-bold text-blue-800 mb-2">ACCA 考证统计系统</Text>
        <Text className="block text-sm text-gray-500">记录考证进度，查看个人成绩</Text>
      </View>

      {/* 功能卡片 */}
      <View className="flex flex-col gap-4">
        {/* 上传成绩 */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <View className="flex flex-row items-center gap-4">
              <View className="flex-shrink-0">
                <Upload size={32} color="#1E40AF" />
              </View>
              <View className="flex-1">
                <Text className="block text-lg font-semibold text-gray-900">上传考证成绩</Text>
                <Text className="block text-sm text-gray-500 mt-1">记录通过的科目和分数</Text>
              </View>
              <View className="flex-shrink-0">
                <Button size="sm" onClick={handleUpload}>
                  <Text className="text-sm">进入</Text>
                </Button>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* 我的记录 */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <View className="flex flex-row items-center gap-4">
              <View className="flex-shrink-0">
                <Users size={32} color="#1E40AF" />
              </View>
              <View className="flex-1">
                <Text className="block text-lg font-semibold text-gray-900">我的考证记录</Text>
                <Text className="block text-sm text-gray-500 mt-1">查看已上传的成绩记录</Text>
              </View>
              <View className="flex-shrink-0">
                <Button size="sm" onClick={handleMyRecords}>
                  <Text className="text-sm">查看</Text>
                </Button>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* 学业导师入口 */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <View className="flex flex-row items-center gap-4">
              <View className="flex-shrink-0">
                <GraduationCap size={32} color="#7C3AED" />
              </View>
              <View className="flex-1">
                <Text className="block text-lg font-semibold text-gray-900">学业导师</Text>
                <Text className="block text-sm text-gray-500 mt-1">查看指导学生的考证情况</Text>
              </View>
              <View className="flex-shrink-0">
                <Button size="sm" onClick={handleAdvisor}>
                  <Text className="text-sm">进入</Text>
                </Button>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* 管理员入口（需要密码） */}
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4">
            <View className="flex flex-row items-center gap-4">
              <View className="flex-shrink-0">
                <Lock size={32} color="#6B7280" />
              </View>
              <View className="flex-1">
                <Text className="block text-lg font-semibold text-gray-700">管理统计</Text>
                <Text className="block text-sm text-gray-400 mt-1">仅限管理员查看统计数据</Text>
              </View>
              <View className="flex-shrink-0">
                <Button size="sm" variant="outline" onClick={handleAdminClick}>
                  <Text className="text-sm text-gray-600">进入</Text>
                </Button>
              </View>
            </View>
          </CardContent>
        </Card>
      </View>

      {/* ACCA 科目说明 */}
      <View className="mt-6">
        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base font-semibold">ACCA 考试科目</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <View className="flex flex-row flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">F1 商业与技术（免考）</Badge>
              <Badge variant="outline" className="text-xs">F2 管理会计</Badge>
              <Badge variant="outline" className="text-xs">F3 财务会计</Badge>
              <Badge variant="outline" className="text-xs">F4 公司法（免考）</Badge>
              <Badge variant="outline" className="text-xs">F5 绩效管理</Badge>
              <Badge variant="outline" className="text-xs">F6 税法（免考）</Badge>
              <Badge variant="outline" className="text-xs">F7 财务报告</Badge>
              <Badge variant="outline" className="text-xs">F8 审计</Badge>
              <Badge variant="outline" className="text-xs">F9 财务管理</Badge>
            </View>
            <View className="flex flex-row flex-wrap gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">SBL 战略商业领袖</Badge>
              <Badge variant="secondary" className="text-xs">SBR 战略商业报告</Badge>
              <Badge variant="secondary" className="text-xs">AFM 高级财务管理</Badge>
              <Badge variant="secondary" className="text-xs">APM 高级绩效管理</Badge>
              <Badge variant="secondary" className="text-xs">AAA 高级审计</Badge>
            </View>
            <Text className="block text-xs text-gray-400 mt-3">
              免考科目（F1/F4/F6）已默认全部通过，无需上传成绩
            </Text>
          </CardContent>
        </Card>
      </View>

      {/* 管理员密码验证弹窗 */}
      {showAdminDialog && (
        <View 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={handleCancel}
        >
          <View 
            className="bg-white rounded-lg p-6 w-80"
            style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', width: '300px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Text className="block text-lg font-bold text-gray-900 mb-4">管理员验证</Text>
            <Text className="block text-sm text-gray-500 mb-4">请输入管理员密码查看统计数据</Text>
            <View className="bg-gray-100 rounded-lg p-3 mb-4">
              <Input
                password
                value={adminPassword}
                onInput={(e) => {
                  setAdminPassword(e.detail.value)
                  setPasswordError(false)
                }}
                placeholder="请输入密码"
                className="w-full bg-transparent text-base outline-none"
                style={{ width: '100%', backgroundColor: 'transparent', fontSize: '16px' }}
              />
            </View>
            {passwordError && (
              <Text className="block text-sm text-red-500 mb-2">密码错误，请重新输入</Text>
            )}
            <View className="flex flex-row gap-3">
              <View className="flex-1">
                <Button variant="outline" onClick={handleCancel} className="w-full">
                  <Text className="text-sm">取消</Text>
                </Button>
              </View>
              <View className="flex-1">
                <Button onClick={handleAdminLogin} className="w-full">
                  <Text className="text-sm">确认</Text>
                </Button>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default IndexPage