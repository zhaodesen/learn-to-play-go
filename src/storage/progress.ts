// 进度存档(小程序本地存储)。所有读写都做了容错,存储不可用时退回内存默认值。
import Taro from '@tarojs/taro'

export interface LevelRecord {
  stars: number
  cleared: boolean
}

export interface ProgressData {
  levels: Record<string, LevelRecord>
}

const KEY = 'ltpg.progress.v1'

function freshData(): ProgressData {
  return { levels: {} }
}

export function loadProgress(): ProgressData {
  try {
    const raw = Taro.getStorageSync<string>(KEY)
    if (!raw) return freshData()
    const parsed = JSON.parse(raw) as Partial<ProgressData>
    return { levels: parsed.levels ?? {} }
  } catch {
    return freshData()
  }
}

export function saveProgress(data: ProgressData): void {
  try {
    Taro.setStorageSync(KEY, JSON.stringify(data))
  } catch {
    /* 忽略:存储已满或不可用 */
  }
}

/** 记录一关通关(取历史最高星级),返回更新后的数据 */
export function recordClear(
  data: ProgressData,
  levelId: string,
  stars: number,
): ProgressData {
  const prevStars = data.levels[levelId]?.stars ?? 0
  const next: ProgressData = {
    ...data,
    levels: {
      ...data.levels,
      [levelId]: { stars: Math.max(stars, prevStars), cleared: true },
    },
  }
  saveProgress(next)
  return next
}

export function resetProgress(): ProgressData {
  const fresh = freshData()
  saveProgress(fresh)
  return fresh
}
