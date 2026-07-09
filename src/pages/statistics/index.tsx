import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Network } from '@/network'
import { Users, Award, Lock, Download, Upload } from 'lucide-react-taro'

interface StudentDetail {
  id: number
  student_no: string
  name: string
  grade: number
  class_name: string
  passed_subjects: string[]
  total_passed: number
  exam_records: {
    subject_code: string
    subject_name: string
    score: number
    pass_status: boolean
    exam_type: string
  }[]
}

interface StatisticsData {
  grade: number
  grade_total_count: number
  uploaded_students: number
  total_records: number
  passed_records: number
  pass_rate: number
  avg_score: number
  subject_stats: { code: string; name: string; passed: number; total: number; rate: number; grade_rate: number }[]
  student_details: StudentDetail[]
}

const StatisticsPage = () => {
  const [selectedGrade, setSelectedGrade] = useState('all')
  const [statistics, setStatistics] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportPassword, setExportPassword] = useState('')

  useEffect(() => {
    fetchStatistics()
  }, [selectedGrade])

  const fetchStatistics = async () => {
    setLoading(true)
    try {
      const res = await Network.request({
        url: '/api/statistics',
        method: 'GET',
        data: selectedGrade === 'all' ? {} : { grade: selectedGrade }
      })
      
      console.log('统计数据响应:', res.data)
      
      if (res.data?.code === 200 && res.data?.data) {
        setStatistics(res.data.data)
      } else {
        setStatistics(null)
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
      Taro.showToast({ title: '获取数据失败', icon: 'error' })
      setStatistics(null)
    } finally {
      setLoading(false)
    }
  }

  const handleExportClick = () => {
    setShowExportDialog(true)
    setExportPassword('')
  }

  const handleExportExcel = async () => {
    if (!exportPassword) {
      Taro.showToast({ title: '请输入管理员密码', icon: 'none' })
      return
    }
    
    setShowExportDialog(false)
    setExporting(true)
    
    const env = Taro.getEnv()
    const isMiniApp = env === Taro.ENV_TYPE.WEAPP || env === Taro.ENV_TYPE.TT
    const downloadUrl = `/api/export/excel?password=${encodeURIComponent(exportPassword)}`
    
    try {
      if (isMiniApp) {
        // 小程序端：下载后打开文档
        Taro.showToast({ title: '正在下载...', icon: 'loading', duration: 3000 })
        const downloadRes = await Network.downloadFile({ url: downloadUrl })
        console.log('下载结果:', downloadRes)
        
        if (downloadRes.statusCode === 200 && downloadRes.tempFilePath) {
          Taro.openDocument({
            filePath: downloadRes.tempFilePath,
            fileType: 'xlsx',
            success: () => {
              Taro.showToast({ title: '导出成功', icon: 'success' })
            },
            fail: (err) => {
              console.error('打开文档失败:', err)
              Taro.showToast({ title: '打开文件失败，请重试', icon: 'none' })
            }
          })
        } else {
          Taro.showToast({ title: '下载失败，请检查密码', icon: 'none' })
        }
      } else {
        // H5 端：直接触发浏览器下载
        Taro.showToast({ title: '正在导出...', icon: 'loading' })
        
        // H5 端使用 fetch 获取文件 blob，然后创建下载链接
        const response = await fetch(downloadUrl)
        if (!response.ok) {
          throw new Error('下载失败')
        }
        
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = 'ACCA考试成绩统计.xlsx'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(blobUrl)
        
        Taro.showToast({ title: '导出成功', icon: 'success' })
      }
    } catch (error) {
      console.error('导出失败:', error)
      Taro.showToast({ title: '导出失败，请重试', icon: 'none' })
    } finally {
      setExporting(false)
    }
  }

  const handleGoUpload = () => {
    Taro.switchTab({ url: '/pages/upload/index' })
  }

  const handleBack = () => {
    Taro.navigateBack()
  }

  const getGradeLabel = (grade: string) => {
    switch (grade) {
      case '1': return '25级'
      case '2': return '24级'
      case '3': return '23级'
      case '4': return '22级'
      default: return '全部年级'
    }
  }


  return (
    <View className="w-full min-h-screen bg-gray-50 p-4 pb-8">
      {/* 管理员提示 */}
      <View className="flex flex-row items-center gap-2 mb-4 bg-yellow-50 rounded-lg p-3 border border-yellow-200">
        <Lock size={20} color="#D97706" />
        <Text className="block text-sm text-yellow-700 flex-1">管理员专区 - 统计数据涉及隐私，仅供管理查看</Text>
        <Button size="sm" variant="outline" onClick={handleBack}>
          <Text className="text-xs">返回</Text>
        </Button>
      </View>

      {/* 年级选择 */}
      <View className="mb-4">
        <Tabs value={selectedGrade} onValueChange={setSelectedGrade}>
          <TabsList className="flex flex-row gap-2">
            <TabsTrigger value="all" className="text-sm">全部</TabsTrigger>
            <TabsTrigger value="1" className="text-sm">25级</TabsTrigger>
            <TabsTrigger value="2" className="text-sm">24级</TabsTrigger>
            <TabsTrigger value="3" className="text-sm">23级</TabsTrigger>
            <TabsTrigger value="4" className="text-sm">22级</TabsTrigger>
          </TabsList>
        </Tabs>
      </View>

      {loading ? (
        <View className="flex flex-col gap-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </View>
      ) : statistics ? (
        <View className="flex flex-col gap-4">
          {/* 标题和导出按钮 */}
          <View className="flex flex-row justify-between items-center mb-2">
            <Text className="block text-lg font-semibold text-gray-700">
              {getGradeLabel(selectedGrade)}统计数据
            </Text>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleExportClick}
              disabled={exporting}
            >
              <View className="flex flex-row items-center gap-1">
                <Download size={16} color="#1E40AF" />
                <Text className="text-xs text-blue-800">{exporting ? '导出中...' : '导出Excel'}</Text>
              </View>
            </Button>
          </View>

          {/* 总体统计 */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <View className="flex flex-row items-center justify-around">
                <View className="flex flex-col items-center">
                  <Users size={24} color="#1E40AF" />
                  <Text className="block text-2xl font-bold text-blue-800 mt-1">{statistics.uploaded_students}</Text>
                  <Text className="block text-xs text-gray-500">已上传学生</Text>
                  {statistics.grade_total_count > 0 && (
                    <Text className="block text-xs text-gray-400">（班级共{statistics.grade_total_count}人）</Text>
                  )}
                </View>
                <View className="flex flex-col items-center">
                  <Award size={24} color="#059669" />
                  <Text className="block text-2xl font-bold text-green-600 mt-1">{statistics.total_records}</Text>
                  <Text className="block text-xs text-gray-500">考试记录</Text>
                </View>

              </View>
              <View className="mt-4 pt-4 border-t border-gray-100">
                <View className="flex flex-row justify-between items-center">
                  <Text className="block text-sm text-gray-600">平均分数</Text>
                  <Text className="block text-lg font-semibold text-gray-900">{statistics.avg_score.toFixed(1)}</Text>
                </View>
                <View className="flex flex-row justify-between items-center mt-2">
                  <Text className="block text-sm text-gray-600">通过记录</Text>
                  <Text className="block text-sm text-green-600">{statistics.passed_records} / {statistics.total_records}</Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* 科目统计 */}
          <Card className="shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-semibold">各科目通过情况</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {statistics.subject_stats && statistics.subject_stats.length > 0 ? (
                <View className="flex flex-col gap-3">
                  {statistics.subject_stats.map((subject) => (
                    <View key={subject.code} className="flex flex-col gap-1">
                      <View className="flex flex-row justify-between items-center">
                        <View className="flex flex-row items-center gap-2">
                          <Badge variant="outline" className="text-xs">{subject.code}</Badge>
                          <Text className="block text-sm text-gray-700 truncate max-w-[180px]">{subject.name}</Text>
                        </View>
                        <View className="flex flex-col items-end">
                          <Text className="block text-sm font-semibold text-gray-900">{subject.passed}人通过</Text>
                          {statistics.grade_total_count > 0 && (
                            <Text className="block text-xs text-blue-600">班级通过率 {subject.grade_rate.toFixed(1)}%</Text>
                          )}
                        </View>
                      </View>
                      <Progress 
                        value={statistics.grade_total_count > 0 ? subject.grade_rate : subject.rate} 
                        className="h-2"
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <View className="flex flex-col items-center justify-center py-8">
                  <Text className="block text-gray-400 text-center">暂无科目数据</Text>
                </View>
              )}
            </CardContent>
          </Card>

          {/* 通过门数分布柱状图 */}
          <Card className="shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-semibold">通过门数分布</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {statistics.student_details && statistics.student_details.length > 0 ? (
                <View className="flex flex-col gap-4">
                  {/* 柱状图区域 */}
                  {(() => {
                    // 统计每个通过门数的人数
                    const passCountMap: Record<number, number> = {}
                    statistics.student_details.forEach(student => {
                      const count = student.total_passed
                      passCountMap[count] = (passCountMap[count] || 0) + 1
                    })
                    
                    // 按门数从高到低排序
                    const sortedCounts = Object.keys(passCountMap)
                      .map(Number)
                      .sort((a, b) => b - a)
                    
                    // 最大人数（用于计算柱状图高度比例）
                    const maxPeople = Math.max(...Object.values(passCountMap), 1)
                    
                    return (
                      <View className="flex flex-row items-end justify-around h-48 bg-gray-50 rounded-lg p-3">
                        {sortedCounts.map(count => {
                          const people = passCountMap[count]
                          const heightPercent = (people / maxPeople) * 100
                          // 根据门数决定颜色
                          let barColor = '#3B82F6' // 默认蓝色
                          if (count >= 9) barColor = '#059669' // 9门以上绿色
                          else if (count >= 6) barColor = '#10B981' // 6-8门浅绿色
                          else if (count >= 3) barColor = '#F59E0B' // 3-5门橙色
                          else barColor = '#EF4444' // 0-2门红色
                          
                          return (
                            <View key={count} className="flex flex-col items-center gap-1 flex-1">
                              {/* 人数标签 */}
                              <Text className="block text-sm font-bold text-gray-700">{people}人</Text>
                              {/* 柱状条 */}
                              <View 
                                className="w-8 rounded-t-lg transition-all"
                                style={{ 
                                  height: `${Math.max(heightPercent * 1.2, 16)}px`,
                                  backgroundColor: barColor,
                                  minHeight: '16px'
                                }}
                              />
                              {/* 门数标签 */}
                              <Text className="block text-xs text-gray-500">{count}门</Text>
                            </View>
                          )
                        })}
                      </View>
                    )
                  })()}
                  
                  {/* 颜色说明 */}
                  <View className="flex flex-row justify-center gap-4 text-xs">
                    <View className="flex flex-row items-center gap-1">
                      <View className="w-3 h-3 rounded bg-green-600" />
                      <Text className="text-gray-500">9门+</Text>
                    </View>
                    <View className="flex flex-row items-center gap-1">
                      <View className="w-3 h-3 rounded bg-green-500" />
                      <Text className="text-gray-500">6-8门</Text>
                    </View>
                    <View className="flex flex-row items-center gap-1">
                      <View className="w-3 h-3 rounded bg-orange-500" />
                      <Text className="text-gray-500">3-5门</Text>
                    </View>
                    <View className="flex flex-row items-center gap-1">
                      <View className="w-3 h-3 rounded bg-red-500" />
                      <Text className="text-gray-500">0-2门</Text>
                    </View>
                  </View>
                  
                  {/* 总计 */}
                  <View className="pt-3 border-t border-gray-100">
                    <View className="flex flex-row justify-between items-center">
                      <Text className="block text-sm text-gray-600">统计总人数</Text>
                      <Text className="block text-sm font-semibold text-gray-900">{statistics.student_details.length}人</Text>
                    </View>
                    <View className="flex flex-row justify-between items-center mt-2">
                      <Text className="block text-sm text-gray-600">平均通过门数</Text>
                      <Text className="block text-sm font-semibold text-blue-600">
                        {(statistics.student_details.reduce((sum, s) => sum + s.total_passed, 0) / statistics.student_details.length).toFixed(1)}门
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="flex flex-col items-center justify-center py-8">
                  <Text className="block text-gray-400 text-center">暂无学生数据</Text>
                </View>
              )}
            </CardContent>
          </Card>
        </View>
      ) : (
        <View className="flex flex-col items-center justify-center py-16">
          <Text className="block text-gray-400 text-center mb-4">暂无统计数据</Text>
          <Text className="block text-sm text-gray-300 text-center mb-4">请先上传考证成绩</Text>
          <Button onClick={handleGoUpload}>
            <View className="flex flex-row items-center gap-2">
              <Upload size={16} color="#fff" />
              <Text className="text-sm">去上传成绩</Text>
            </View>
          </Button>
        </View>
      )}
      
      {/* 导出密码验证对话框 */}
      <Dialog open={showExportDialog} onOpenChange={(open) => setShowExportDialog(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导出Excel需要验证密码</DialogTitle>
          </DialogHeader>
          <View className="py-4">
            <Text className="block text-sm text-gray-600 mb-2">请输入管理员密码</Text>
            <Input
              password
              placeholder="请输入密码"
              value={exportPassword}
              onInput={(e) => setExportPassword(e.detail.value)}
            />
          </View>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              <Text>取消</Text>
            </Button>
            <Button onClick={handleExportExcel}>
              <Text>{exporting ? '导出中...' : '确认导出'}</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === 学生详情列表 === */}
      {statistics?.student_details && statistics.student_details.length > 0 && (
        <View className="mt-4">
          <Text className="block text-lg font-semibold mb-3">学生成绩明细（共{statistics.student_details.length}人）</Text>
          <View className="flex flex-col gap-2">
            {statistics.student_details.map((student, idx) => (
              <CollapsibleStudentCard key={student.student_no || idx} student={student} />
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

function CollapsibleStudentCard({ student }: { student: StudentDetail }) {
  const [expanded, setExpanded] = useState(false)
  const exemptSubjects = ['F1', 'F4', 'F6']
  const examRecords = student.exam_records || []
  const actualRecords = examRecords.filter(r => !exemptSubjects.includes(r.subject_code))

  return (
    <Card className="overflow-hidden">
      <View
        className="flex flex-row items-center justify-between p-3 active:opacity-70"
        onClick={() => setExpanded(!expanded)}
      >
        <View className="flex flex-row items-center gap-3 flex-1">
          <View className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Text className="block text-sm font-bold text-blue-700">{student.name.charAt(0)}</Text>
          </View>
          <View className="flex-1">
            <Text className="block text-sm font-semibold">{student.name}</Text>
            <View className="flex flex-row items-center gap-2 mt-1">
              <Text className="block text-xs text-gray-500">{student.student_no}</Text>
              <Text className="block text-xs text-gray-400">|</Text>
              <Text className="block text-xs text-gray-500">{student.class_name}</Text>
            </View>
          </View>
          <Badge className="mr-2">{student.total_passed}门通过</Badge>
          <Text className="block text-gray-400 text-lg">{expanded ? '▼' : '▶'}</Text>
        </View>
      </View>

      {expanded && (
        <View className="border-t border-gray-100 px-3 py-2">
          {/* 免考科目 */}
          <View className="mb-2">
            <Text className="block text-xs text-gray-400 mb-1">免考科目</Text>
            <View className="flex flex-row flex-wrap gap-1.5">
              {exemptSubjects.map(code => (
                <Badge key={code} className="bg-green-50 text-green-600 border-green-200 text-xs">
                  {code} 免考
                </Badge>
              ))}
            </View>
          </View>

          {/* 实际考试科目 */}
          {actualRecords.length > 0 ? (
            <View>
              <Text className="block text-xs text-gray-400 mb-1">考试科目</Text>
              <View className="flex flex-row flex-wrap gap-1.5">
                {actualRecords.map((r, i) => (
                  <Badge
                    key={i}
                    className={r.pass_status
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200 text-xs'
                      : 'bg-red-50 text-red-500 border-red-200 text-xs'
                    }
                  >
                    {r.subject_code}={r.score}{r.pass_status ? '✅' : '❌'}
                  </Badge>
                ))}
              </View>
            </View>
          ) : (
            <Text className="block text-xs text-gray-400 italic">暂无考试记录</Text>
          )}

          {/* 通过门数统计 */}
          <View className="mt-2 pt-2 border-t border-gray-50 flex flex-row justify-end">
            <Text className="block text-xs text-blue-600 font-medium">
              通过 {student.total_passed}/9 门
            </Text>
          </View>
        </View>
      )}
    </Card>
  )
}

export default StatisticsPage