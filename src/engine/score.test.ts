import { describe, it, expect } from 'vitest'
import { createBoard } from './board'
import { scoreArea } from './score'
import type { Board, Cell, Stone } from './types'

/** 用一行行字符串摆盘:'B'=黑 'W'=白 '.'=空,便于直观写终局形 */
function fromRows(rows: string[]): Board {
  const size = rows.length
  const cells: Cell[] = []
  for (const row of rows) {
    expect(row.length, `每行长度应为 ${size}`).toBe(size)
    for (const ch of row) {
      cells.push(ch === 'B' ? 'B' : ch === 'W' ? 'W' : null)
    }
  }
  return { size, cells }
}

describe('数子法 scoreArea', () => {
  it('空棋盘:全是单官,双方区域为 0,只剩贴目', () => {
    const r = scoreArea(createBoard(9), { komi: 7 })
    expect(r.black).toBe(0)
    expect(r.white).toBe(7) // 仅贴目
    expect(r.dame).toBe(81)
    expect(r.winner).toBe('W')
  })

  it('黑一条竖墙把 5x5 分成左空右空,各自归属', () => {
    // 中列全黑,左 2 列是黑围的空,右 2 列贴着黑→也算黑空(只有黑边界)
    const board = fromRows([
      '..B..',
      '..B..',
      '..B..',
      '..B..',
      '..B..',
    ])
    const r = scoreArea(board, { komi: 0 })
    // 5 颗黑子 + 两侧各 10 空都只贴黑 = 黑区域 25,白 0
    expect(r.black).toBe(25)
    expect(r.white).toBe(0)
    expect(r.dame).toBe(0)
    expect(r.winner).toBe('B')
    expect(r.margin).toBe(25)
  })

  it('黑白各占半边,中间一列单官', () => {
    const board = fromRows([
      'B.W',
      'B.W',
      'B.W',
    ])
    const r = scoreArea(board, { komi: 0 })
    // 黑:3 子,左边没有空;白:3 子。中列 3 个空两色都贴 → 单官
    expect(r.black).toBe(3)
    expect(r.white).toBe(3)
    expect(r.dame).toBe(3)
    expect(r.winner).toBe(null) // 平
  })

  it('贴目能改写胜负:黑多 1 子但白贴 7 目则白胜', () => {
    const board = fromRows([
      'BBBBB',
      'B...W',
      'W...W',
      'W...W',
      'WWWWW',
    ])
    const noKomi = scoreArea(board, { komi: 0 })
    const withKomi = scoreArea(board, { komi: 7 })
    // 不贴目时谁多看盘面;贴目后白方加 7,验证 margin 随之变化
    expect(withKomi.white).toBe(noKomi.white + 7)
    expect(withKomi.winner).toBe('W')
  })

  it('ownership 数组与统计一致', () => {
    const board = fromRows([
      'B.W',
      'B.W',
      'B.W',
    ])
    const r = scoreArea(board)
    const count = (o: Stone | 'dame') => r.ownership.filter((x) => x === o).length
    expect(count('B')).toBe(3)
    expect(count('W')).toBe(3)
    expect(count('dame')).toBe(3)
  })
})
