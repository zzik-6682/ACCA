import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Network } from '@/network'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdvisorLogin() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('请输入导师姓名')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await Network.request({
        url: '/api/exam-records/advisor/login',
        method: 'POST',
        data: { name: trimmed }
      })
      if (res.data.code === 200) {
        Taro.setStorageSync('advisor_name', trimmed)
        Taro.redirectTo({ url: '/pages/advisor/dashboard/index' })
      } else {
        setError(res.data.msg || '登录失败')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-xl">学业导师登录</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="mb-4">
            <Text className="block text-sm font-medium text-gray-700 mb-2">导师姓名</Text>
            <Input
              className="w-full"
              placeholder="请输入您的姓名"
              value={name}
              onInput={(e) => { setName(e.detail.value); setError('') }}
            />
          </View>
          {error ? (
            <Text className="block text-sm text-red-500 mb-3">{error}</Text>
          ) : null}
          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </Button>
        </CardContent>
      </Card>
    </View>
  )
}
