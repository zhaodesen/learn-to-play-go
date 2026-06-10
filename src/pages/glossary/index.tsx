// 术语词典页:全部围棋术语的大白话解释,支持搜索。
import { useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { ScrollView, View, Text, Input } from '@tarojs/components'
import { allTerms } from '../../data/glossary'
import { pageLayoutStyle } from '../../utils/layout'
import './index.scss'

export default function Glossary() {
  const [kw, setKw] = useState('')

  const entries = useMemo(() => {
    const all = allTerms()
    const k = kw.trim()
    if (!k) return all
    return all.filter((e) => e.term.includes(k) || e.short.includes(k))
  }, [kw])

  return (
    <View className='gl' style={pageLayoutStyle()}>
      <View className='gl__bar'>
        <View className='gl__back' onClick={() => Taro.navigateBack()}>
          ‹
        </View>
        <Text className='gl__name'>术语词典</Text>
        <View className='gl__back gl__back--ghost' />
      </View>

      <View className='gl__search'>
        <Input
          className='gl__input'
          placeholder='搜索术语,如:气、打劫、真眼…'
          placeholderClass='gl__placeholder'
          value={kw}
          onInput={(e) => setKw(e.detail.value)}
        />
      </View>

      <ScrollView scrollY className='gl__list'>
        {entries.map((e) => (
          <View key={e.term} className='gl__item'>
            <Text className='gl__term'>{e.term}</Text>
            <Text className='gl__short'>{e.short}</Text>
          </View>
        ))}
        {entries.length === 0 && (
          <View className='gl__empty'>没有找到相关术语</View>
        )}
        <View className='gl__foot'>共收录 {allTerms().length} 个术语 · 全部为零基础大白话解释</View>
      </ScrollView>
    </View>
  )
}
