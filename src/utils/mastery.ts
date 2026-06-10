// 掌握度展示映射:存档仍存 1~3 星,仅展示层翻译为教学化标签。
export interface Mastery {
  label: string
  /** 样式后缀:high / mid / low */
  tone: 'high' | 'mid' | 'low'
}

export function starsToMastery(stars: number | undefined, cleared: boolean): Mastery | null {
  if (!cleared) return null
  if ((stars ?? 0) >= 3) return { label: '已掌握', tone: 'high' }
  if ((stars ?? 0) === 2) return { label: '基本掌握', tone: 'mid' }
  return { label: '待巩固', tone: 'low' }
}

/** 从教学文案里提取 [[术语]] / [[显示|术语]] 引用的术语名(去重,保持出现顺序) */
export function extractTerms(...texts: Array<string | undefined>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const text of texts) {
    if (!text) continue
    const re = /\[\[([^\]]+)\]\]/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      const inner = m[1]
      const sep = inner.indexOf('|')
      const term = sep >= 0 ? inner.slice(sep + 1) : inner
      if (!seen.has(term)) {
        seen.add(term)
        out.push(term)
      }
    }
  }
  return out
}
