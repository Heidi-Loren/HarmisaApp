import { View, Button, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function B2CHome() {
  const goTo = (url: string) => {
    Taro.navigateTo({ url })
  }

  return (
    <View className='b2c-home'>
      <Text className='title'>饮食推荐逻辑</Text>
      <Text className='desc'>
        我们的推荐系统基于三层立体金字塔模型，将体质、环境和行为动因整合，为你生成个性化饮食建议。
      </Text>

      {/* 第一层：体质层 */}
      <View className='layer-box'>
        <Text className='layer-title'>1️⃣ 体质层</Text>
        <Text className='layer-desc'>
          基于中医九型体质理论，通过问卷识别你的主型与副型体质，决定基础饮食方向。
        </Text>
        <Button
          className='main-btn'
          onClick={() => goTo('/pages/B2C/constitution/index')}
        >
          进入体质测评
        </Button>
      </View>

      {/* 第二层：环境层 */}
      <View className='layer-box'>
        <Text className='layer-title'>2️⃣ 环境层</Text>
        <Text className='layer-desc'>
          结合当地气候与地域特点，动态调整饮食结构，使推荐更契合季节与环境需求。
        </Text>
        <Button
          className='main-btn'
          onClick={() => goTo('/pages/B2C/environment/index')}
        >
          进入环境测评
        </Button>
      </View>

      {/* 第三层：四维动因层 */}
      <View className='layer-box'>
        <Text className='layer-title'>3️⃣ 四维动因层</Text>
        <Text className='layer-desc'>
          分析你的饮食动因类型（主动自护 / 习惯驱动 / 社交影响 / 情绪调节），
          精准匹配可持续的饮食方案。
        </Text>
        <Button
          className='main-btn'
          onClick={() => goTo('/pages/B2C/motivation/index')}
        >
          进入四维动因测评
        </Button>
      </View>
    </View>
  )
}
