import { describe, it, expect } from 'vitest'
import {
  analyzeMove,
  countLiberties,
  createBoard,
  getGroup,
  placeStone,
} from './board'
import type { Board, Cell, Stone } from './types'

/** 测试辅助:直接摆出一个盘面(不校验规则) */
function withStones(
  size: number,
  stones: Array<[number, number, Stone]>,
): Board {
  const cells = new Array<Cell>(size * size).fill(null)
  for (const [x, y, c] of stones) cells[y * size + x] = c
  return { size, cells }
}

describe('数气(liberties)', () => {
  it('角上的一子有 2 口气', () => {
    const b = withStones(9, [[0, 0, 'B']])
    expect(countLiberties(b, 0, 0)).toBe(2)
  })

  it('边上的一子有 3 口气', () => {
    const b = withStones(9, [[4, 0, 'B']])
    expect(countLiberties(b, 4, 0)).toBe(3)
  })

  it('中央的一子有 4 口气', () => {
    const b = withStones(9, [[4, 4, 'B']])
    expect(countLiberties(b, 4, 4)).toBe(4)
  })

  it('相连的两子算作一块,共享气', () => {
    const b = withStones(9, [
      [4, 4, 'B'],
      [5, 4, 'B'],
    ])
    const g = getGroup(b, 4, 4)
    expect(g?.stones.length).toBe(2)
    expect(g?.liberties.length).toBe(6) // 两子横连,周围 6 口气
  })
})

describe('提子(capture)', () => {
  it('堵掉最后一口气就能提走对方一子', () => {
    // 白(0,0) 角上,黑已占 (1,0),最后一气在 (0,1)
    const b = withStones(9, [
      [0, 0, 'W'],
      [1, 0, 'B'],
    ])
    const r = placeStone(b, 0, 1, 'B')
    expect(r.ok).toBe(true)
    expect(r.captured).toEqual([{ x: 0, y: 0 }])
    expect(r.board && r.board.cells[0]).toBe(null) // (0,0) 已被提空
  })

  it('能一次提走一整块多子', () => {
    // 白两子 (0,0)(0,1) 被黑包到只剩一口气 (0,2)
    const b = withStones(9, [
      [0, 0, 'W'],
      [0, 1, 'W'],
      [1, 0, 'B'],
      [1, 1, 'B'],
    ])
    const r = placeStone(b, 0, 2, 'B')
    expect(r.ok).toBe(true)
    expect(r.captured?.length).toBe(2)
  })
})

describe('禁入点 / 自杀(suicide)', () => {
  it('落子后自己没气且没提到对方子 → 非法', () => {
    // 白占住角 (0,0) 的两个邻点,黑下 (0,0) 是自杀
    const b = withStones(9, [
      [1, 0, 'W'],
      [0, 1, 'W'],
    ])
    const r = placeStone(b, 0, 0, 'B')
    expect(r.ok).toBe(false)
    expect(r.error).toBe('suicide')
  })

  it('若这一手能提掉对方,则不算自杀(提子优先)', () => {
    // 3x3:白块 {(1,0),(0,1),(1,1)} 仅剩 (0,0) 一口气,
    // 黑下 (0,0) 应提掉整块白,而不是被判自杀。
    const b = withStones(3, [
      [1, 0, 'W'],
      [0, 1, 'W'],
      [1, 1, 'W'],
      [2, 0, 'B'],
      [2, 1, 'B'],
      [1, 2, 'B'],
      [0, 2, 'B'],
    ])
    const r = placeStone(b, 0, 0, 'B')
    expect(r.ok).toBe(true)
    expect(r.captured?.length).toBe(3)
  })
})

describe('打劫(ko)', () => {
  it('提一子形成劫后,对方不能立即回提', () => {
    // 黑下 (2,1) 提白 (1,1),并形成劫
    const b = withStones(5, [
      [1, 1, 'W'],
      [3, 1, 'W'],
      [2, 0, 'W'],
      [2, 2, 'W'],
      [0, 1, 'B'],
      [1, 0, 'B'],
      [1, 2, 'B'],
    ])
    const r = placeStone(b, 2, 1, 'B')
    expect(r.ok).toBe(true)
    expect(r.captured).toEqual([{ x: 1, y: 1 }])
    expect(r.koPoint).toEqual({ x: 1, y: 1 })

    // 白想立刻在 (1,1) 回提 → 被劫规则拦截
    const back = placeStone(r.board as Board, 1, 1, 'W', r.koPoint)
    expect(back.ok).toBe(false)
    expect(back.error).toBe('ko')
  })
})

describe('落子前分析(analyzeMove)', () => {
  it('能预览这一手会提走哪些子', () => {
    const b = withStones(9, [
      [0, 0, 'W'],
      [1, 0, 'B'],
    ])
    const a = analyzeMove(b, 0, 1, 'B')
    expect(a.legal).toBe(true)
    expect(a.captured).toEqual([{ x: 0, y: 0 }])
  })

  it('能识别出送进去会被叫吃(只剩 1 气)', () => {
    // 白 (1,0)(0,1) 在角,黑下 (0,0):提不到子,自己只剩…其实是自杀
    // 这里测"落子后气数"的报告:黑在 (2,2) 旁贴一子留 1 气的场景
    const b = withStones(9, [
      [1, 2, 'W'],
      [0, 1, 'W'],
      [1, 0, 'W'],
    ])
    // 黑下 (0,0):邻 (1,0)白、(0,1)白,本应自杀(0 气)
    const a = analyzeMove(b, 0, 0, 'B')
    expect(a.legal).toBe(false)
    expect(a.error).toBe('suicide')
  })

  it('正常落子合法且报告气数', () => {
    const b = createBoard(9)
    const a = analyzeMove(b, 4, 4, 'B')
    expect(a.legal).toBe(true)
    expect(a.selfLiberties).toBe(4)
  })
})
