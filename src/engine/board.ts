// 围棋规则引擎 —— 棋盘与落子规则
//
// 设计要点:
// - 不可变:placeStone 返回新棋盘,从不修改入参,方便悔棋 / 关卡正解树回溯。
// - "气" = 一块相连同色棋子紧邻的空交叉点,用洪水填充(flood-fill)计算。
// - 落子顺序:先落子 → 提走相邻无气的对方块 → 再判己方是否自杀。
// - 打劫(ko)用经典"简单劫"规则:提一子且己方成单子单气时,禁止对方立即回提。

import type {
  Board,
  Cell,
  GroupInfo,
  MoveAnalysis,
  Point,
  PlaceResult,
  Stone,
} from './types'

/** 取对方颜色 */
export function opponent(color: Stone): Stone {
  return color === 'B' ? 'W' : 'B'
}

/** 把坐标转成可比较 / 可做 Set key 的字符串 */
export function pointKey(p: Point): string {
  return `${p.x},${p.y}`
}

/** 创建一个空棋盘 */
export function createBoard(size: number): Board {
  return { size, cells: new Array<Cell>(size * size).fill(null) }
}

function idx(size: number, x: number, y: number): number {
  return y * size + x
}

/** 坐标是否在棋盘内 */
export function inBounds(board: Board, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < board.size && y < board.size
}

/** 读取某点状态 */
export function getCell(board: Board, x: number, y: number): Cell {
  return board.cells[idx(board.size, x, y)]
}

/** 上下左右四个相邻点(自动裁掉越界) */
function neighbors(board: Board, x: number, y: number): Point[] {
  const pts: Point[] = []
  if (x > 0) pts.push({ x: x - 1, y })
  if (x < board.size - 1) pts.push({ x: x + 1, y })
  if (y > 0) pts.push({ x, y: y - 1 })
  if (y < board.size - 1) pts.push({ x, y: y + 1 })
  return pts
}

/**
 * 从 (x,y) 出发,洪水填充找出整块相连同色棋子及其所有气。
 * 若该点为空则返回 null。
 */
export function getGroup(board: Board, x: number, y: number): GroupInfo | null {
  const color = board.cells[idx(board.size, x, y)]
  if (color === null) return null

  const size = board.size
  const seen = new Uint8Array(size * size)
  const stones: Point[] = []
  const liberties: Point[] = []
  const libSeen = new Uint8Array(size * size)

  const stack: Point[] = [{ x, y }]
  seen[idx(size, x, y)] = 1

  while (stack.length > 0) {
    const p = stack.pop() as Point
    stones.push(p)
    for (const n of neighbors(board, p.x, p.y)) {
      const ni = idx(size, n.x, n.y)
      const c = board.cells[ni]
      if (c === null) {
        if (libSeen[ni] === 0) {
          libSeen[ni] = 1
          liberties.push(n)
        }
      } else if (c === color && seen[ni] === 0) {
        seen[ni] = 1
        stack.push(n)
      }
    }
  }

  return { stones, liberties }
}

/** 数某块棋的气数(便捷封装) */
export function countLiberties(board: Board, x: number, y: number): number {
  const g = getGroup(board, x, y)
  return g ? g.liberties.length : 0
}

interface Simulation {
  cells: Cell[]
  captured: Point[]
  selfLiberties: number
  selfStoneCount: number
}

/**
 * 模拟"在 (x,y) 落 color 子并完成提子"的过程,返回提子后的棋盘数组与统计。
 * 不做合法性判断(占位 / 自杀 / 劫由上层决定),供 placeStone 与 analyzeMove 共用。
 * 调用前需保证该点为空。
 */
function simulatePlacement(
  board: Board,
  x: number,
  y: number,
  color: Stone,
): Simulation {
  const size = board.size
  const cells = board.cells.slice() as Cell[]
  cells[idx(size, x, y)] = color
  const work: Board = { size, cells }

  const opp = opponent(color)
  const captured: Point[] = []
  const checked = new Uint8Array(size * size)

  for (const n of neighbors(work, x, y)) {
    const ni = idx(size, n.x, n.y)
    if (cells[ni] === opp && checked[ni] === 0) {
      const g = getGroup(work, n.x, n.y) as GroupInfo
      for (const s of g.stones) checked[idx(size, s.x, s.y)] = 1
      if (g.liberties.length === 0) {
        for (const s of g.stones) {
          cells[idx(size, s.x, s.y)] = null
          captured.push(s)
        }
      }
    }
  }

  // 提子后再数己方这块的气(work.cells 与 cells 同引用,已是最新局面)
  const self = getGroup(work, x, y) as GroupInfo
  return {
    cells,
    captured,
    selfLiberties: self.liberties.length,
    selfStoneCount: self.stones.length,
  }
}

/**
 * 落子。成功返回新棋盘、被提子、以及新的劫点;失败返回原因。
 * @param koPoint 上一手产生的劫争禁着点;本手若落在此点则判 ko 非法。
 */
export function placeStone(
  board: Board,
  x: number,
  y: number,
  color: Stone,
  koPoint?: Point | null,
): PlaceResult {
  if (!inBounds(board, x, y)) return { ok: false, error: 'out-of-bounds' }
  if (getCell(board, x, y) !== null) return { ok: false, error: 'occupied' }
  if (koPoint && koPoint.x === x && koPoint.y === y) {
    return { ok: false, error: 'ko' }
  }

  const sim = simulatePlacement(board, x, y, color)

  // 禁入点(自杀):没提到任何子,且自己也没气
  if (sim.captured.length === 0 && sim.selfLiberties === 0) {
    return { ok: false, error: 'suicide' }
  }

  // 计算新的劫点:恰好提走 1 子,且落下的子成为"单子单气"——这正是劫的形状
  let newKo: Point | null = null
  if (
    sim.captured.length === 1 &&
    sim.selfStoneCount === 1 &&
    sim.selfLiberties === 1
  ) {
    newKo = sim.captured[0]
  }

  return {
    ok: true,
    board: { size: board.size, cells: sim.cells },
    captured: sim.captured,
    koPoint: newKo,
  }
}

/**
 * 分析某一步(不改变棋盘),供 UI 在落子前做友好提示:
 * 会提走哪些子、落子后自己几口气、是否禁入点 / 劫。
 */
export function analyzeMove(
  board: Board,
  x: number,
  y: number,
  color: Stone,
  koPoint?: Point | null,
): MoveAnalysis {
  if (!inBounds(board, x, y)) {
    return { legal: false, error: 'out-of-bounds', captured: [], selfLiberties: 0 }
  }
  if (getCell(board, x, y) !== null) {
    return { legal: false, error: 'occupied', captured: [], selfLiberties: 0 }
  }

  const sim = simulatePlacement(board, x, y, color)

  if (sim.captured.length === 0 && sim.selfLiberties === 0) {
    return { legal: false, error: 'suicide', captured: [], selfLiberties: 0 }
  }
  if (koPoint && koPoint.x === x && koPoint.y === y) {
    // 劫:形状上能提子,但规则不允许立即回提,仍把 captured 给出用于解释
    return {
      legal: false,
      error: 'ko',
      captured: sim.captured,
      selfLiberties: sim.selfLiberties,
    }
  }

  return { legal: true, captured: sim.captured, selfLiberties: sim.selfLiberties }
}
