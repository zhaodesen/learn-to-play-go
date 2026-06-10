// 太极图:首页标识 / 行棋指示 / 思考中旋转动画共用。
// 小程序不支持内联 SVG,改用纯 CSS(渐变 + 圆形 View)绘制。
import { View } from '@tarojs/components'

export function Taiji({
  size = 40,
  spin = false,
  className = '',
}: {
  size?: number
  spin?: boolean
  className?: string
}) {
  return (
    <View
      className={`taiji${spin ? ' taiji--spin' : ''} ${className}`.trim()}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <View className='taiji__half' />
      <View className='taiji__dot taiji__dot--top' />
      <View className='taiji__dot taiji__dot--bottom' />
    </View>
  )
}
