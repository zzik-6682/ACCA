export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '我的记录' })
  : { navigationBarTitleText: '我的记录' }