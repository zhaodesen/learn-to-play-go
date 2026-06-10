// 首页:课程目录(章节 → 课时列表)。
// 教学产品形态:进度统计 + 掌握度标签;「连续学习」(整屏滑动模式)作为二级入口。
import { useMemo, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { ScrollView, View, Text } from '@tarojs/components'
import { CHAPTERS, LEVELS } from '../../levels/data'
import { starsToMastery } from '../../utils/mastery'
import { loadProgress } from '../../storage/progress'
import { pageLayoutStyle } from '../../utils/layout'
import type { ProgressData } from '../../storage/progress'
import './index.scss'

export default function Index() {
  const [data, setData] = useState<ProgressData>(() => loadProgress())

  // 每课解锁状态 + 当前应学课时(最靠前的「已解锁未完成」)
  const { unlocked, startIndex, clearedCount } = useMemo(() => {
    const u: boolean[] = []
    let start = 0
    let found = false
    let cleared = 0
    LEVELS.forEach((l, i) => {
      const ok = i === 0 || !!data.levels[LEVELS[i - 1].id]?.cleared
      u[i] = ok
      if (data.levels[l.id]?.cleared) cleared++
      if (ok && !data.levels[l.id]?.cleared && !found) {
        start = i
        found = true
      }
    })
    if (!found) start = LEVELS.length - 1
    return { unlocked: u, startIndex: start, clearedCount: cleared }
  }, [data])

  const total = LEVELS.length
  const percent = Math.round((clearedCount / total) * 100)

  useDidShow(() => {
    setData(loadProgress())
  })

  function openLesson(i: number) {
    if (!unlocked[i]) {
      Taro.showToast({ title: '请先完成前面的课时', icon: 'none' })
      return
    }
    Taro.navigateTo({ url: `/pages/level/index?id=${LEVELS[i].id}` })
  }

  function go(url: string) {
    Taro.navigateTo({ url })
  }

  return (
    <View className='cat' style={pageLayoutStyle()}>
      <ScrollView scrollY className='cat__scroll'>
        {/* 课程头 */}
        <View className='cat__hero'>
          <Text className='cat__title'>围棋入门课</Text>
          <Text className='cat__subtitle'>
            零基础系统课程 · {CHAPTERS.length} 个单元 · {total} 节互动课时
          </Text>
          <View className='cat__progress'>
            <View className='cat__bar'>
              <View className='cat__bar-fill' style={{ width: `${percent}%` }} />
            </View>
            <Text className='cat__progress-text'>
              已学 {clearedCount}/{total} 课 · {percent}%
            </Text>
          </View>
        </View>

        {/* 继续学习:直接进入当前课时 */}
        <View className='cat__next' onClick={() => openLesson(startIndex)}>
          <View className='cat__next-info'>
            <Text className='cat__next-tag'>
              {clearedCount === 0
                ? '开始学习'
                : clearedCount >= total
                  ? '已学完 · 温习一课'
                  : '继续学习'}
              {' · 第 '}
              {startIndex + 1} 课
            </Text>
            <Text className='cat__next-title'>{LEVELS[startIndex].title}</Text>
            <Text className='cat__next-ch'>{LEVELS[startIndex].chapterTitle}</Text>
          </View>
          <View className='cat__next-go'>▶</View>
        </View>

        {/* 术语词典入口 */}
        <View className='cat__tool' onClick={() => go('/pages/glossary/index')}>
          <Text className='cat__tool-glyph'>书</Text>
          <Text className='cat__tool-label'>术语词典 · 不懂的词随时查</Text>
          <Text className='cat__tool-arrow'>›</Text>
        </View>

        {/* 课程大纲 */}
        {CHAPTERS.map((ch) => {
          const lessons = LEVELS.map((l, i) => ({ level: l, i })).filter(
            ({ level }) => level.chapterIndex === ch.index,
          )
          if (lessons.length === 0) return null
          const done = lessons.filter(({ level }) => data.levels[level.id]?.cleared).length
          return (
            <View key={ch.index} className='cat__chapter'>
              <View className='cat__ch-head'>
                <View className='cat__ch-titles'>
                  <Text className='cat__ch-title'>
                    第{['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'][ch.index] ?? ch.index + 1}单元 · {ch.title}
                  </Text>
                  <Text className='cat__ch-subtitle'>{ch.subtitle}</Text>
                </View>
                <Text className='cat__ch-count'>
                  {done}/{lessons.length}
                </Text>
              </View>

              {lessons.map(({ level, i }) => {
                const rec = data.levels[level.id]
                const m = starsToMastery(rec?.stars, !!rec?.cleared)
                const isUnlocked = unlocked[i]
                const isCurrent = i === startIndex && !rec?.cleared
                return (
                  <View
                    key={level.id}
                    className={`cat__lesson${isUnlocked ? '' : ' cat__lesson--locked'}${
                      isCurrent ? ' cat__lesson--current' : ''
                    }`}
                    onClick={() => openLesson(i)}
                  >
                    <Text className='cat__lesson-no'>{i + 1}</Text>
                    <View className='cat__lesson-main'>
                      <Text className='cat__lesson-title'>{level.title}</Text>
                      {isCurrent && <Text className='cat__lesson-cur'>学到这里</Text>}
                    </View>
                    {m ? (
                      <Text className={`mastery mastery--${m.tone}`}>{m.label}</Text>
                    ) : isUnlocked ? (
                      <Text className='cat__lesson-go'>{isCurrent ? '开始 ›' : '学习 ›'}</Text>
                    ) : (
                      <Text className='cat__lesson-lock'>🔒</Text>
                    )}
                  </View>
                )
              })}
            </View>
          )
        })}

        <View className='cat__foot'>
          <Text>完成全部课时即可掌握围棋基本规则与吃子、死活、数子要领</Text>
        </View>
      </ScrollView>
    </View>
  )
}
