// 终局数子与胜负判定 —— 采用「数子法 / 区域计分(area scoring)」。
// 一块棋的归属 = 自己的子 + 自己围住的空。这是中国规则的数法,也最适合 9 路实战毕业关。
//
// 前提:传入的应当是一个「已收完官子、死子已被提走」的终局盘面。
// 引擎不替玩家判定死活——死子要先在棋盘上提掉再来数子(教学关里我们直接摆好干净的终局形)。
import type { Board, Point, Stone } from './types'
import { getCell, inBounds } from './board'

/** 一个空白区域(连通的空交叉点)及其边界接触到的颜色 */
interface EmptyRegion {
  points: Point[]
  touchesBlack: boolean
  touchesWhite: boolean
}

/**
 * 把棋盘上所有空交叉点按四连通切成若干区域,并记录每个区域边界都贴着哪种颜色。
 * 只贴黑 → 黑空;只贴白 → 白空;两色都贴(或谁都不贴=空棋盘)→ 单官/中立。
 */
function findEmptyRegions(board: Board): EmptyRegion[] {
  const size = board.size
  const seen = new Uint8Array(size * size)
  const regions: EmptyRegion[] = []

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      if (seen[i] === 1 || getCell(board, x, y) !== null) continue

      const points: Point[] = []
      let touchesBlack = false
      let touchesWhite = false
      const stack: Point[] = [{ x, y }]
      seen[i] = 1

      while (stack.length > 0) {
        const p = stack.pop() as Point
        points.push(p)
        const around = [
          { x: p.x - 1, y: p.y },
          { x: p.x + 1, y: p.y },
          { x: p.x, y: p.y - 1 },
          { x: p.x, y: p.y + 1 },
        ]
        for (const n of around) {
          if (!inBounds(board, n.x, n.y)) continue
          const ni = n.y * size + n.x
          const c = getCell(board, n.x, n.y)
          if (c === null) {
            if (seen[ni] === 0) {
              seen[ni] = 1
              stack.push(n)
            }
          } else if (c === 'B') {
            touchesBlack = true
          } else {
            touchesWhite = true
          }
        }
      }

      regions.push({ points, touchesBlack, touchesWhite })
    }
  }

  return regions
}

/** 一个交叉点的归属:黑空 / 白空 / 黑子 / 白子 / 单官(中立空) */
export type Owner = 'B' | 'W' | 'dame'

export interface ScoreResult {
  /** 黑方区域 = 黑子数 + 黑空数 */
  black: number
  /** 白方区域 = 白子数 + 白空数 */
  white: number
  /** 黑围住的空点数 */
  blackTerritory: number
  /** 白围住的空点数 */
  whiteTerritory: number
  /** 单官 / 中立点数(两色都贴或无人贴) */
  dame: number
  /** 贴目(komi):白方补偿,计入白方区域 */
  komi: number
  /** 胜方;平局为 null */
  winner: Stone | null
  /** 胜方领先的子数(已含贴目);平局为 0 */
  margin: number
  /** 每个交叉点的归属,供 UI 着色:行优先,长度 = size*size */
  ownership: Owner[]
}

export interface ScoreOptions {
  /** 贴目,默认 9 路常用的 7 目(中国规则白贴 3¾ 子≈7 目);可按需调整 */
  komi?: number
}

/**
 * 对一个终局盘面数子并判定胜负。
 * 数子法:黑/白各自的「区域」= 棋盘上自己的子 + 自己单独围住的空;白方再加贴目。
 * 区域大的一方获胜,差值即领先子数。
 */
export function scoreArea(board: Board, options: ScoreOptions = {}): ScoreResult {
  const komi = options.komi ?? 7
  const size = board.size
  const ownership: Owner[] = new Array<Owner>(size * size).fill('dame')

  let blackStones = 0
  let whiteStones = 0
  for (let i = 0; i < board.cells.length; i++) {
    const c = board.cells[i]
    if (c === 'B') {
      blackStones++
      ownership[i] = 'B'
    } else if (c === 'W') {
      whiteStones++
      ownership[i] = 'W'
    }
  }

  let blackTerritory = 0
  let whiteTerritory = 0
  let dame = 0
  for (const region of findEmptyRegions(board)) {
    let owner: Owner
    if (region.touchesBlack && !region.touchesWhite) {
      owner = 'B'
      blackTerritory += region.points.length
    } else if (region.touchesWhite && !region.touchesBlack) {
      owner = 'W'
      whiteTerritory += region.points.length
    } else {
      owner = 'dame'
      dame += region.points.length
    }
    if (owner !== 'dame') {
      for (const p of region.points) ownership[p.y * size + p.x] = owner
    }
  }

  const black = blackStones + blackTerritory
  const white = whiteStones + whiteTerritory + komi
  const diff = black - white
  const winner: Stone | null = diff > 0 ? 'B' : diff < 0 ? 'W' : null

  return {
    black,
    white,
    blackTerritory,
    whiteTerritory,
    dame,
    komi,
    winner,
    margin: Math.abs(diff),
    ownership,
  }
}
