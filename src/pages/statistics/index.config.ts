export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '统计数据' })
  : { navigationBarTitleText: '统计数据' }