import { View, Button, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function Index() {
  const goToPage = (url: string) => {
    Taro.navigateTo({ url })
  }

  return (
    <View className='index'>
      <Text className='title'>欢迎使用“Harmisa和律”健康饮食小助手</Text>
      <Text className='subtitle'>请选择服务入口</Text>

      <View className='btn-group'>
        <Button
          className='main-btn'
          onClick={() => goToPage('/pages/B2C/home/index')}
        >
          饮食推荐逻辑
        </Button>

        <Button
          className='main-btn'
          onClick={() => goToPage('/pages/B2B/index')}
        >
          筛选推荐结果
        </Button>

        <Button
          className='main-btn'
          onClick={() => goToPage('/pages/profile/index')}
        >
          个人健康画像
        </Button>
      </View>
    </View>
  )
}
