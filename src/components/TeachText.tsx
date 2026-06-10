// 渲染教学文案:把 **粗体** 渲染为加粗,把 [[术语]] / [[显示文字|术语]] 渲染为可点击高亮。
import { Text, View } from '@tarojs/components'

interface TeachTextProps {
  text: string
  onTerm: (term: string) => void
  className?: string
}

export function TeachText({ text, onTerm, className }: TeachTextProps) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g)
  return (
    <View className={className ?? 'teach'}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} className='teach__strong'>
              {part.slice(2, -2)}
            </Text>
          )
        }
        if (part.startsWith('[[') && part.endsWith(']]')) {
          const inner = part.slice(2, -2)
          const sep = inner.indexOf('|')
          const label = sep >= 0 ? inner.slice(0, sep) : inner
          const term = sep >= 0 ? inner.slice(sep + 1) : inner
          return (
            <Text
              key={i}
              className='term'
              onClick={(e) => {
                e.stopPropagation()
                onTerm(term)
              }}
            >
              {label}
            </Text>
          )
        }
        return <Text key={i}>{part}</Text>
      })}
    </View>
  )
}
