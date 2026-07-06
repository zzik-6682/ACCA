export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '上传成绩' })
  : { navigationBarTitleText: '上传成绩' }