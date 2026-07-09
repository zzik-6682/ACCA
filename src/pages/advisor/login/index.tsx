import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Network } from '@/network'

export default function AdvisorLogin() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<'login' | 'setPassword'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 检查是否已设置密码
  const checkPasswordStatus = async (advisorName: string) => {
    try {
      const res = await Network.request({
        url: '/api/exam-records/advisor/check-password',
        data: { name: advisorName }
      })
      if (res.data?.has_password) {
        setStep('login')
      } else {
        setStep('setPassword')
      }
    } catch {
      setError('查询失败，请重试')
    }
  }

  // 输入姓名后检查
  const handleNameBlur = () => {
    if (name.trim()) {
      checkPasswordStatus(name.trim())
    }
  }

  // 登录
  const handleLogin = async () => {
    if (!name.trim() || !password) {
      setError('请输入姓名和密码')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await Network.request({
        url: '/api/exam-records/advisor/login',
        method: 'POST',
        data: { name: name.trim(), password }
      })
      if (res.data?.name) {
        Taro.setStorageSync('advisor_name', res.data.name)
        Taro.redirectTo({ url: '/pages/advisor/dashboard/index' })
      } else {
        setError(res.data?.msg || '登录失败')
      }
    } catch {
      setError('登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 设置密码
  const handleSetPassword = async () => {
    if (!password) {
      setError('请输入密码')
      return
    }
    if (password.length < 4) {
      setError('密码至少4位')
      return
    }
    if (password !== confirmPassword) {
      setError('两次密码不一致')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await Network.request({
        url: '/api/exam-records/advisor/set-password',
        method: 'POST',
        data: { name: name.trim(), password }
      })
      if (res.data?.code === 200) {
        Taro.setStorageSync('advisor_name', name.trim())
        Taro.redirectTo({ url: '/pages/advisor/dashboard/index' })
      } else {
        setError(res.data?.msg || '设置失败')
      }
    } catch {
      setError('设置失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="min-h-screen bg-background p-4">
      <View className="mt-20 mb-8 text-center">
        <Text className="block text-2xl font-bold text-foreground mb-2">学业导师入口</Text>
        <Text className="block text-sm text-muted-foreground">
          {step === 'login' ? '输入姓名和密码登录' : '首次使用，请设置密码'}
        </Text>
      </View>

      <Card className="max-w-sm mx-auto">
        <CardContent className="p-6 space-y-4">
          <View>
            <Text className="block text-sm font-medium text-foreground mb-2">导师姓名</Text>
            <Input
              className="w-full bg-muted border-border rounded-lg px-3 py-2"
              placeholder="请输入您的姓名"
              value={name}
              onInput={(e) => setName(e.detail.value)}
              onBlur={handleNameBlur}
            />
          </View>

          <View>
            <Text className="block text-sm font-medium text-foreground mb-2">
              {step === 'login' ? '密码' : '设置密码'}
            </Text>
            <Input
              className="w-full bg-muted border-border rounded-lg px-3 py-2"
              password
              placeholder={step === 'login' ? '请输入密码' : '请设置密码（至少4位）'}
              value={password}
              onInput={(e) => setPassword(e.detail.value)}
            />
          </View>

          {step === 'setPassword' && (
            <View>
              <Text className="block text-sm font-medium text-foreground mb-2">确认密码</Text>
              <Input
                className="w-full bg-muted border-border rounded-lg px-3 py-2"
                password
                placeholder="请再次输入密码"
                value={confirmPassword}
                onInput={(e) => setConfirmPassword(e.detail.value)}
              />
            </View>
          )}

          {error && (
            <Text className="block text-sm text-destructive">{error}</Text>
          )}

          <Button
            className="w-full bg-primary text-primary-foreground rounded-lg py-3"
            onClick={step === 'login' ? handleLogin : handleSetPassword}
            disabled={loading}
          >
            <Text className="text-base font-medium">
              {loading ? '处理中...' : step === 'login' ? '登录' : '设置密码并登录'}
            </Text>
          </Button>
        </CardContent>
      </Card>
    </View>
  )
}
