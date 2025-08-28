// src/app.config.ts
export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/B2C/home/index',
    'pages/B2C/constitution/index',
    'pages/B2C/environment/index',
    'pages/B2C/motivation/index',
    'pages/B2B/index',
    'pages/profile/index'  
  ],
  window: {
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f8f8f8',
    backgroundTextStyle: 'light'
  }, 
  permission: {
    'scope.userLocation': { desc: '用于根据您的位置推荐合适的饮食建议' }
  },
  requiredPrivateInfos: ['getLocation']
})
