export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/upload/index',
    'pages/my/index',
    'pages/statistics/index', // 管理员专用页面，不在 TabBar 中
    'pages/advisor/login/index',
    'pages/advisor/dashboard/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'ACCA考证统计',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#6B7280',
    selectedColor: '#1E40AF',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: './assets/tabbar/house.png',
        selectedIconPath: './assets/tabbar/house-active.png'
      },
      {
        pagePath: 'pages/upload/index',
        text: '上传',
        iconPath: './assets/tabbar/upload.png',
        selectedIconPath: './assets/tabbar/upload-active.png'
      },
      {
        pagePath: 'pages/my/index',
        text: '我的',
        iconPath: './assets/tabbar/user.png',
        selectedIconPath: './assets/tabbar/user-active.png'
      }
    ]
  }
})