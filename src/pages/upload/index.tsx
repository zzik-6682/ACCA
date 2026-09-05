import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Network } from '@/network'
import { Camera } from 'lucide-react-taro'

// ACCA 科目列表 - F1, F4, F6 免考科目默认通过，无需上传成绩
const ACCA_SUBJECTS = [
  { code: 'F2', name: '管理会计 Management Accounting (MA)', exempt: false },
  { code: 'F3', name: '财务会计 Financial Accounting (FA)', exempt: false },
  { code: 'F5', name: '绩效管理 Performance Management (PM)', exempt: false },
  { code: 'F7', name: '财务报告 Financial Reporting (FR)', exempt: false },
  { code: 'F8', name: '审计与认证业务 Audit and Assurance (AA)', exempt: false },
  { code: 'F9', name: '财务管理 Financial Management (FM)', exempt: false },
  { code: 'SBL', name: '战略商业领袖 Strategic Business Leader (SBL)', exempt: false },
  { code: 'SBR', name: '战略商业报告 Strategic Business Reporting (SBR)', exempt: false },
  { code: 'AFM', name: '高级财务管理 Advanced Financial Management (AFM)', exempt: false },
  { code: 'APM', name: '高级绩效管理 Advanced Performance Management (APM)', exempt: false },
  { code: 'AAA', name: '高级审计与认证业务 Advanced Audit and Assurance (AAA)', exempt: false },
]

// 班级列表（年级和班级合并）
const CLASSES = [
  { value: '国会2501', label: '国会2501', grade: 1 },
  { value: '国会2401', label: '国会2401', grade: 2 },
  { value: '国会2301', label: '国会2301', grade: 3 },
  { value: '国会2201', label: '国会2201', grade: 4 },
]

// 最近考季（历史数据已导入，之后的数据需手动输入月份）
const EXAM_SEASONS = [
  { value: '2026-06', label: '2026年6月考季（最新）' },
  { value: '2026-03', label: '2026年3月考季' },
  { value: '2025-12', label: '2025年12月考季' },
  { value: '2025-09', label: '2025年9月考季' },
  { value: '2025-06', label: '2025年6月考季' },
  { value: 'custom', label: '自定义月份...' },
]

const UploadPage = () => {
  const [formData, setFormData] = useState({
    studentNo: '',
    name: '',
    className: '',
    subjectCode: '',
    score: '',
    examSeason: '',
    passStatus: false,
    screenshotUrl: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [screenshotKey, setScreenshotKey] = useState('')
  const [customMonth, setCustomMonth] = useState('')
  const [isCustomSeason, setIsCustomSeason] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle')
  const [verifyMessage, setVerifyMessage] = useState('')
  let verifyTimer: any = null

  // 验证学号和姓名
  const verifyStudentInfo = async (studentNo: string, name: string) => {
    if (!studentNo || !name) {
      setVerifyStatus('idle')
      setVerifyMessage('')
      return
    }

    // 防抖
    if (verifyTimer) clearTimeout(verifyTimer)
    
    verifyTimer = setTimeout(async () => {
      setVerifyStatus('verifying')
      try {
        const res = await Network.request({
          url: '/api/exam-records/verify',
          method: 'POST',
          data: { student_no: studentNo, name }
        })
        
        const result = res.data
        if (result?.code === 200) {
          setVerifyStatus('success')
          setVerifyMessage(result.msg || '信息验证通过')
          // 自动填充班级（如果还没选的话）
          const student = result.data
          if (student && student.class_name && !formData.className) {
            setFormData(prev => ({ ...prev, className: student.class_name }))
          }
        } else {
          setVerifyStatus('error')
          setVerifyMessage(result?.msg || '学号或姓名不匹配')
        }
      } catch (e) {
        setVerifyStatus('error')
        setVerifyMessage('验证失败，请检查信息')
      }
    }, 500)
  }

  // 获取当前选择的科目信息
  const selectedSubject = ACCA_SUBJECTS.find(s => s.code === formData.subjectCode)

  // 根据班级获取年级
  const selectedClass = CLASSES.find(c => c.value === formData.className)
  const grade = selectedClass?.grade || 0

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // 学号或姓名变化时触发验证
    if (field === 'studentNo' || field === 'name') {
      const nextData = { ...formData, [field]: value }
      verifyStudentInfo(nextData.studentNo, nextData.name)
    }
  }

  const handleChooseImage = async () => {
    try {
      const isH5 = Taro.getEnv() === Taro.ENV_TYPE.WEB
      
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        Taro.showToast({ title: '正在上传...', icon: 'loading' })
        
        let uploadRes: any
        
        // H5 端需要特殊处理，绕过 Taro uploadFile 的 blob fetch 问题
        if (isH5 && res.tempFiles && res.tempFiles[0]) {
          // H5 端：获取原始 File 对象，手动构建 FormData
          // 注意：跨 iframe 场景下 instanceof File 可能为 false，所以用更宽松的类型检查
          const file = res.tempFiles[0] as any
          const originalFile = file.originalFileObj || file
          
          console.log('H5 端上传，文件信息:', { 
            hasOriginalFile: !!originalFile, 
            fileType: originalFile?.type,
            fileName: originalFile?.name,
            isFile: originalFile instanceof File,
            isBlob: originalFile instanceof Blob,
            hasName: originalFile?.name !== undefined,
            hasSize: typeof originalFile?.size === 'number'
          })
          
          // 更宽松的类型检查：只要有 name 或 size 属性，就当作 FileLike 对象处理
          if (originalFile && typeof originalFile === 'object' && (originalFile instanceof File || originalFile instanceof Blob || originalFile.name || typeof originalFile.size === 'number')) {
            const uploadFormData = new FormData()
            const fileName = originalFile.name || `screenshot_${Date.now()}.png`
            console.log('使用 FormData + fetch 上传，文件名:', fileName)
            uploadFormData.append('file', originalFile, fileName)
            
            // 使用 XMLHttpRequest 而非 fetch，避免 Service Worker 拦截
            const result = await new Promise<any>((resolve, reject) => {
              const xhr = new XMLHttpRequest()
              xhr.open('POST', '/api/upload/screenshot')
              xhr.onload = () => {
                console.log('XHR 响应状态:', xhr.status)
                console.log('XHR 响应内容:', xhr.responseText)
                try {
                  resolve(JSON.parse(xhr.responseText))
                } catch (e) {
                  reject(new Error('响应解析失败: ' + xhr.responseText))
                }
              }
              xhr.onerror = (e) => {
                console.error('XHR 上传失败:', e)
                reject(new Error('上传请求失败'))
              }
              xhr.send(uploadFormData)
            })
            
            uploadRes = result
          } else {
            // 如果无法获取原始 File，尝试使用 filePath
            console.log('无法获取原始 File，尝试使用 Network.uploadFile')
            uploadRes = await Network.uploadFile({
              url: '/api/upload/screenshot',
              filePath: res.tempFilePaths[0],
              name: 'file'
            })
          }
        } else {
          // 小程序端：直接使用 Network.uploadFile
          console.log('小程序端上传')
          uploadRes = await Network.uploadFile({
            url: '/api/upload/screenshot',
            filePath: res.tempFilePaths[0],
            name: 'file'
          })
        }
        
        console.log('上传响应:', uploadRes)
        
        // 统一解析上传响应：不同场景（fetch / Network.uploadFile）返回格式不同
        let parsedResult: { code?: number; data?: { key?: string; url?: string } } = uploadRes as any
        
        // Network.uploadFile 返回 { data: '{"code":200,...}', statusCode: 200 }
        if (uploadRes && typeof uploadRes.data === 'string') {
          try {
            parsedResult = JSON.parse(uploadRes.data)
            console.log('解析 Network.uploadFile 响应:', parsedResult)
          } catch (e) {
            console.error('响应 JSON 解析失败:', e)
          }
        } else if (uploadRes && uploadRes.data && typeof uploadRes.data === 'object' && typeof (uploadRes as any).code !== 'number') {
          // XHR/fetch 方式的响应 { code, data } 中 data 是对象，但上层已有 code
          // 只有当 uploadRes 本身没有 code 属性时，才说明需要取 uploadRes.data
          // 否则 uploadRes 就是完整的响应体
          parsedResult = uploadRes.data as any
        }
        
        if (parsedResult.code === 200 && parsedResult.data?.key) {
          setScreenshotKey(parsedResult.data.key)
          const imageUrl = parsedResult.data?.url || ''
          setFormData(prev => ({ 
            ...prev, 
            screenshotUrl: imageUrl
          }))
          Taro.showToast({ title: '上传成功', icon: 'success' })
        } else {
          console.error('上传失败，响应内容:', parsedResult)
          Taro.showToast({ title: '上传失败', icon: 'error' })
        }
      }
    } catch (error) {
      console.error('选择图片失败:', error)
      Taro.showToast({ title: '操作失败', icon: 'error' })
    }
  }

  const handleSubmit = async () => {
    // 表单验证
    if (!formData.studentNo || !formData.name || !formData.className) {
      Taro.showToast({ title: '请填写完整的学生信息', icon: 'none' })
      return
    }

    // 必须先验证学号姓名匹配
    if (verifyStatus !== 'success') {
      Taro.showToast({ title: '请先完成学生信息验证', icon: 'none' })
      return
    }
    
    if (!formData.subjectCode || !formData.examSeason) {
      Taro.showToast({ title: '请选择科目和考季', icon: 'none' })
      return
    }
    
    if (!screenshotKey) {
      Taro.showToast({ title: '请上传成绩截图', icon: 'none' })
      return
    }
    
    if (!formData.score) {
      Taro.showToast({ title: '请填写分数', icon: 'none' })
      return
    }
    
    setLoading(true)
    
    try {
      const score = parseInt(formData.score)
      const res = await Network.request({
        url: '/api/exam-records',
        method: 'POST',
        data: {
          student_no: formData.studentNo,
          name: formData.name,
          grade: grade,
          class_name: formData.className,
          subject_code: formData.subjectCode,
          subject_name: selectedSubject?.name || '',
          score: score,
          exam_season: formData.examSeason,
          exam_type: 'global_exam',
          pass_status: score >= 50,
          screenshot_key: screenshotKey,
          notes: formData.notes
        }
      })
      
      console.log('提交响应:', res.data)
      
      if (res.data?.code === 200) {
        Taro.showToast({ title: '提交成功', icon: 'success' })
        // 重置表单
        setFormData({
          studentNo: '',
          name: '',
          className: '',
          subjectCode: '',
          score: '',
          examSeason: '',
          passStatus: false,
          screenshotUrl: '',
          notes: ''
        })
        setScreenshotKey('')
        setCustomMonth('')
        setIsCustomSeason(false)

      } else {
        Taro.showToast({ title: res.data?.msg || '提交失败', icon: 'error' })
      }
    } catch (error) {
      console.error('提交失败:', error)
      Taro.showToast({ title: '提交失败，请重试', icon: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="w-full min-h-screen bg-gray-50 p-4 pb-20">
      <Text className="block text-xl font-bold text-blue-800 mb-2">上传考证成绩</Text>
      <Text className="block text-sm text-gray-500 mb-4">填写您的ACCA考试成绩信息</Text>
      
      {/* 学生信息 */}
      <Card className="shadow-sm mb-4">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base font-semibold">学生信息</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 flex flex-col gap-4">
          <View>
            <Label className="text-sm text-gray-600 mb-1">学号 *</Label>
            <View className="bg-gray-50 rounded-lg px-3 py-2">
              <Input 
                className="w-full bg-transparent"
                placeholder="请输入学号"
                value={formData.studentNo}
                onInput={(e) => handleInputChange('studentNo', e.detail.value)}
              />
            </View>
          </View>
          
          <View>
            <Label className="text-sm text-gray-600 mb-1">姓名 *</Label>
            <View className="bg-gray-50 rounded-lg px-3 py-2">
              <Input 
                className="w-full bg-transparent"
                placeholder="请输入姓名"
                value={formData.name}
                onInput={(e) => handleInputChange('name', e.detail.value)}
              />
            </View>
          </View>

          {verifyMessage && (
            <Text className={`block text-sm ${
              verifyStatus === 'success' ? 'text-emerald-600' : 'text-red-500'
            }`}>
              {verifyStatus === 'success' ? '✓ ' : '⚠ '}{verifyMessage}
            </Text>
          )}
          
          <View>
            <Label className="text-sm text-gray-600 mb-1">班级 *</Label>
            <Select value={formData.className} onValueChange={(v) => handleInputChange('className', v)}>
              <SelectTrigger className="bg-gray-50">
                <SelectValue placeholder="请选择班级" />
              </SelectTrigger>
              <SelectContent>
                {CLASSES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>
        </CardContent>
      </Card>
      
      {/* 考试信息 */}
      <Card className="shadow-sm mb-4">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base font-semibold">考试信息</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 flex flex-col gap-4">
          <View>
            <Label className="text-sm text-gray-600 mb-1">考试科目 *</Label>
            <Select value={formData.subjectCode} onValueChange={(v) => handleInputChange('subjectCode', v)}>
              <SelectTrigger className="bg-gray-50">
                <SelectValue placeholder="请选择科目" />
              </SelectTrigger>
              <SelectContent>
                {ACCA_SUBJECTS.map(s => (
                  <SelectItem key={s.code} value={s.code}>
                    <Text className="block">{s.code} - {s.name}</Text>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSubject && (
              <View className="mt-2">
                <Text className="block text-sm text-gray-600">{selectedSubject.name}</Text>
              </View>
            )}
          </View>
          
          <View>
            <Label className="text-sm text-gray-600 mb-1">考季 *</Label>
            <Select 
              value={isCustomSeason ? 'custom' : formData.examSeason} 
              onValueChange={(v) => {
                if (v === 'custom') {
                  setIsCustomSeason(true)
                  setFormData(prev => ({ ...prev, examSeason: '' }))
                } else {
                  setIsCustomSeason(false)
                  handleInputChange('examSeason', v)
                }
              }}
            >
              <SelectTrigger className="bg-gray-50">
                <SelectValue placeholder="请选择考季" />
              </SelectTrigger>
              <SelectContent>
                {EXAM_SEASONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {isCustomSeason && (
              <View className="mt-2">
                <Label className="text-xs text-gray-500">输入通过月份（如：06表示6月）</Label>
                <View className="flex flex-row items-center gap-2 mt-1">
                  <View className="bg-gray-50 rounded-lg px-3 py-2 flex-1">
                    <Input 
                      className="w-full bg-transparent"
                      placeholder="月份"
                      value={customMonth}
                      onInput={(e) => {
                        setCustomMonth(e.detail.value)
                        const month = e.detail.value.padStart(2, '0')
                        setFormData(prev => ({ ...prev, examSeason: `2026-${month}` }))
                      }}
                    />
                  </View>
                  <Text className="block text-sm text-gray-500">→ 2026-{customMonth.padStart(2, '0')}</Text>
                </View>
              </View>
            )}
          </View>
          
          <View>
            <Label className="text-sm text-gray-600 mb-1">分数 *</Label>
            <View className="bg-gray-50 rounded-lg px-3 py-2">
              <Input 
                className="w-full bg-transparent"
                placeholder="请输入分数（50分及格）"
                value={formData.score}
                onInput={(e) => handleInputChange('score', e.detail.value)}
              />
            </View>
          </View>
          
          <View>
            <Label className="text-sm text-gray-600 mb-1">成绩截图 *</Label>
            <View className="mt-2 flex flex-col gap-2">
              <Text className="block text-xs text-gray-500">请上传全球考成绩截图</Text>
              <Button 
                onClick={handleChooseImage}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Camera size={18} color="#ffffff" className="mr-2" />
                <Text className="text-white">选择图片</Text>
              </Button>
              {screenshotKey && (
                <View className="flex flex-row items-center gap-1 p-2 bg-green-50 rounded">
                  <Text className="block text-sm text-green-600">✓ 已上传</Text>
                </View>
              )}
            </View>
          </View>
          
          <View>
            <Label className="text-sm text-gray-600 mb-1">备注</Label>
            <View className="bg-gray-50 rounded-lg px-3 py-2">
              <Input 
                className="w-full bg-transparent"
                placeholder="可选备注信息"
                value={formData.notes}
                onInput={(e) => handleInputChange('notes', e.detail.value)}
              />
            </View>
          </View>
        </CardContent>
      </Card>
      
      {/* 提交按钮 */}
      <Button 
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 py-4"
      >
        <Text className="text-white font-medium">{loading ? '提交中...' : '提交成绩'}</Text>
      </Button>
    </View>
  )
}

export default UploadPage