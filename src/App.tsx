import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { sound } from './audio/sound'
import { loadProgress } from './storage/progress'

import './app.scss'

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    // 启动时按存档同步一次音效设置
    const s = loadProgress().settings
    sound.configure({ sfx: s.sfx, volume: s.volume })
  })

  // children 是将要会渲染的页面
  return children
}

export default App
