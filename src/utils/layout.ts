// 屏幕适配:自定义导航下的安全区与胶囊避让。
// 微信里 env(safe-area-inset-top) 在安卓机与开发者工具上恒为 0,
// 不能用它给自定义导航留位,必须用 API 实测状态栏 / 胶囊 / 底部安全区,
// 再以 CSS 变量(真实 px,不参与 rpx 换算)下发给页面根节点,
// fixed 子元素同样能继承这些变量。
import Taro from '@tarojs/taro'
import type { CSSProperties } from 'react'

interface LayoutMetrics {
  /** 状态栏高度 px */
  statusBarHeight: number
  /** 胶囊上边缘 px(无胶囊平台为状态栏下 4px) */
  capsuleTop: number
  /** 胶囊高度 px */
  capsuleHeight: number
  /** 自定义导航底边 px:页面内容应从这里开始 */
  navBottom: number
  /** 屏幕右缘到胶囊左缘的距离 + 间距 px,右上角悬浮元素用它避开胶囊 */
  capsuleClear: number
  /** 底部安全区(iPhone 横条)px */
  safeBottom: number
}

let cached: LayoutMetrics | null = null

export function getLayoutMetrics(): LayoutMetrics {
  if (cached) return cached

  let statusBarHeight = 20
  let windowWidth = 375
  let safeBottom = 0
  try {
    const win =
      typeof Taro.getWindowInfo === 'function'
        ? Taro.getWindowInfo()
        : Taro.getSystemInfoSync()
    statusBarHeight = win.statusBarHeight ?? 20
    windowWidth = win.windowWidth ?? 375
    if (win.safeArea && win.screenHeight) {
      safeBottom = Math.max(0, win.screenHeight - win.safeArea.bottom)
    }
  } catch {
    /* h5 等环境取默认值 */
  }

  // 胶囊按钮(微信/抖音均有);个别环境会返回全 0,需兜底
  let capsuleTop = statusBarHeight + 4
  let capsuleHeight = 32
  let capsuleLeft = windowWidth - 97
  try {
    const rect = Taro.getMenuButtonBoundingClientRect?.()
    if (rect && rect.height > 0 && rect.top > 0) {
      capsuleTop = rect.top
      capsuleHeight = rect.height
      capsuleLeft = rect.left
    }
  } catch {
    /* 不支持该 API 的平台用兜底值 */
  }

  cached = {
    statusBarHeight,
    capsuleTop,
    capsuleHeight,
    navBottom: capsuleTop + capsuleHeight + 8,
    capsuleClear: Math.max(16, windowWidth - capsuleLeft + 10),
    safeBottom,
  }
  return cached
}

/**
 * 页面根节点 inline style:下发安全区 CSS 变量。
 * 用法:<View className='xxx' style={pageLayoutStyle()}>
 */
export function pageLayoutStyle(): CSSProperties {
  if (process.env.TARO_ENV === 'h5') {
    // H5 没有胶囊,env() 在浏览器里可靠
    return {
      '--safe-top': 'env(safe-area-inset-top)',
      '--capsule-top': 'calc(env(safe-area-inset-top) + 8px)',
      '--capsule-h': '32px',
      '--nav-bottom': 'calc(env(safe-area-inset-top) + 48px)',
      '--capsule-clear': '16px',
      '--safe-bottom': 'env(safe-area-inset-bottom)',
    } as CSSProperties
  }
  const m = getLayoutMetrics()
  return {
    '--safe-top': `${m.statusBarHeight}px`,
    '--capsule-top': `${m.capsuleTop}px`,
    '--capsule-h': `${m.capsuleHeight}px`,
    '--nav-bottom': `${m.navBottom}px`,
    '--capsule-clear': `${m.capsuleClear}px`,
    '--safe-bottom': `${m.safeBottom}px`,
  } as CSSProperties
}
