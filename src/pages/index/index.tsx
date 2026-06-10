// 首页:抖音式整屏滑动闯关 feed(一关一页,上滑下一关)。
// web 版手写 wheel/touch 翻页;小程序直接用纵向 Swiper,原生跟手。
import { useMemo, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { Swiper, SwiperItem, View, Text } from '@tarojs/components'
import { CHAPTERS, LEVELS } from '../../levels/data'
import { createBoard } from '../../engine/board'
import { toCnNum } from '../../utils/cn'
import { Goban } from '../../components/Goban'
import { sound } from '../../audio/sound'
import { loadProgress, updateSettings } from '../../storage/progress'
import type { Board } from '../../engine/types'
import type { Level } from '../../levels/types'
import type { ProgressData } from '../../storage/progress'
import './index.scss'

/** 由关卡初始摆子拼出只读棋盘(供缩略预览) */
function previewBoard(level: Level): Board {
  const cells = createBoard(level.boardSize).cells.slice()
  for (const s of level.stones) cells[s.y * level.boardSize + s.x] = s.c
  return { size: level.boardSize, cells }
}

export default function Index() {
  const [data, setData] = useState<ProgressData>(() => loadProgress())

  // 每关解锁状态 + 当前应玩关卡(最靠前的「已解锁未通关」)
  const { unlocked, startIndex } = useMemo(() => {
    const u: boolean[] = []
    let start = 0
    let foundStart = false
    LEVELS.forEach((l, i) => {
      const ok = i === 0 || !!data.levels[LEVELS[i - 1].id]?.cleared
      u[i] = ok
      if (ok && !data.levels[l.id]?.cleared && !foundStart) {
        start = i
        foundStart = true
      }
    })
    return { unlocked: u, startIndex: start }
  }, [data])

  const [active, setActive] = useState(startIndex)

  // 从关卡页返回时刷新进度(可能刚通关解锁了新关)
  useDidShow(() => {
    const fresh = loadProgress()
    setData(fresh)
    sound.configure({ sfx: fresh.settings.sfx, volume: fresh.settings.volume })
  })

  function toggleSfx() {
    const next = !data.settings.sfx
    const d = updateSettings(data, { sfx: next })
    setData(d)
    sound.configure({ sfx: next, volume: d.settings.volume })
    sound.play('click')
  }

  function openLevel(id: string) {
    sound.play('click')
    Taro.navigateTo({ url: `/pages/level/index?id=${id}` })
  }

  function openPlay() {
    sound.play('click')
    Taro.navigateTo({ url: '/pages/play/index' })
  }

  const activeChapter = LEVELS[active]?.chapterIndex ?? 0

  return (
    <View className='home'>
      {/* 右上角:音效开关 */}
      <View className='home__actions'>
        <View
          className={`home__sfx${data.settings.sfx ? ' home__sfx--on' : ''}`}
          onClick={toggleSfx}
        >
          {data.settings.sfx ? '🔊' : '🔇'}
        </View>
      </View>

      {/* 左上角:自由对弈入口 */}
      <View className='home__play' onClick={openPlay}>
        <Text className='home__play-glyph'>弈</Text>
        <Text className='home__play-label'>自由对弈</Text>
      </View>

      {/* 侧边章节进度轨 */}
      <View className='feed__rail'>
        {CHAPTERS.map((ch) => (
          <View
            key={ch.index}
            className={`feed__dot${ch.index === activeChapter ? ' feed__dot--on' : ''}`}
            onClick={() => {
              const first = LEVELS.findIndex((l) => l.chapterIndex === ch.index)
              if (first >= 0) setActive(first)
            }}
          />
        ))}
      </View>

      <Swiper
        className='feed'
        vertical
        current={active}
        duration={240}
        onChange={(e) => setActive(e.detail.current)}
      >
        {LEVELS.map((level, i) => {
          const rec = data.levels[level.id]
          const isUnlocked = unlocked[i]
          const done = !!rec?.cleared
          const isLast = i === LEVELS.length - 1
          const near = Math.abs(i - active) <= 1 // 只渲染前后一屏的棋盘画布
          return (
            <SwiperItem key={level.id}>
              <View
                className={`feed__page feed__page--c${level.chapterIndex % 5}${
                  isUnlocked ? '' : ' feed__page--locked'
                }`}
              >
                <Text className='feed__bignum'>{toCnNum(i + 1)}</Text>

                <Text className='feed__title'>{level.title}</Text>

                <View className={`feed__board${isUnlocked ? '' : ' feed__board--blur'}`}>
                  {near ? (
                    <Goban
                      board={previewBoard(level)}
                      toPlay={null}
                      markers={level.markers}
                      showSmartHints={false}
                    />
                  ) : (
                    <View className='feed__board-skeleton' />
                  )}
                  {!isUnlocked && <Text className='feed__lock'>🔒</Text>}
                </View>

                {rec?.stars ? (
                  <Text className='feed__stars'>
                    {'★'.repeat(rec.stars)}
                    {'☆'.repeat(3 - rec.stars)}
                  </Text>
                ) : null}

                <View
                  className={`feed__cta${done ? ' feed__cta--done' : ''}${
                    isUnlocked ? '' : ' feed__cta--locked'
                  }`}
                  onClick={() => isUnlocked && openLevel(level.id)}
                >
                  {!isUnlocked ? '尚未解锁' : done ? '重温此关' : '进入此关'}
                </View>

                {!isLast && (
                  <View className='feed__swipe'>
                    <Text className='feed__chevron'>︿</Text>
                    <Text>上滑下一关</Text>
                  </View>
                )}
              </View>
            </SwiperItem>
          )
        })}
      </Swiper>
    </View>
  )
}
