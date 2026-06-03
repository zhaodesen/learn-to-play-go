// 进度与设置存档(localStorage)。所有读写都做了容错,localStorage 不可用时退回内存默认值。

export interface LevelRecord {
  stars: number
  cleared: boolean
}

export interface Settings {
  sfx: boolean
  music: boolean
  volume: number
}

export interface ProgressData {
  levels: Record<string, LevelRecord>
  settings: Settings
}

const KEY = 'ltpg.progress.v1'
const DEFAULT_SETTINGS: Settings = { sfx: true, music: false, volume: 0.6 }

function freshData(): ProgressData {
  return { levels: {}, settings: { ...DEFAULT_SETTINGS } }
}

export function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return freshData()
    const parsed = JSON.parse(raw) as Partial<ProgressData>
    return {
      levels: parsed.levels ?? {},
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    }
  } catch {
    return freshData()
  }
}

export function saveProgress(data: ProgressData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* 忽略:隐私模式或存储已满 */
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

export function updateSettings(
  data: ProgressData,
  partial: Partial<Settings>,
): ProgressData {
  const next: ProgressData = {
    ...data,
    settings: { ...data.settings, ...partial },
  }
  saveProgress(next)
  return next
}

export function resetProgress(): ProgressData {
  const fresh = freshData()
  saveProgress(fresh)
  return fresh
}
