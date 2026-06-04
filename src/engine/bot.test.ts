import { describe, it, expect } from 'vitest'
import { analyzeMove } from './board'
import { isEyeFor } from './lifedeath'
import { chooseBotMove } from './bot'
import type { Board, Cell, Point, Stone } from './types'

/** 用行字符串摆盘:'B'=黑 'W'=白 '.'=空 */
function fromRows(rows: string[]): Board {
  const size = rows.length
  const cells: Cell[] = []
  for (const row of rows) {
    expect(row.length).toBe(size)
    for (const ch of row) cells.push(ch === 'B' ? 'B' : ch === 'W' ? 'W' : null)
  }
  return { size, cells }
}

const det = { random: () => 0, jitter: 0 } // 确定性:无随机扰动

function eq(p: Point | null, x: number, y: number): boolean {
  return !!p && p.x === x && p.y === y
}

describe('规则机器人 chooseBotMove', () => {
  it('能吃子:对方一块只剩一口气时,落子提掉它', () => {
    // 白 (4,4) 被黑三面围,唯一气在 (4,5);黑应点 (4,5) 提子
    const board = fromRows([
      '.........',
      '.........',
      '.........',
      '....B....',
      '...BWB...',
      '.........',
      '.........',
      '.........',
      '.........',
    ])
    const mv = chooseBotMove(board, 'B', null, det)
    expect(eq(mv, 4, 5), `应吃在 (4,5),实际 ${JSON.stringify(mv)}`).toBe(true)
    expect(analyzeMove(board, mv!.x, mv!.y, 'B').captured.length).toBeGreaterThanOrEqual(1)
  })

  it('会逃子:自己一块被叫吃时,长一手逃出气来', () => {
    // 黑 (4,4) 被白三面围,气在 (4,5);黑应长到 (4,5) 把气数变多
    const board = fromRows([
      '.........',
      '.........',
      '.........',
      '....W....',
      '...WBW...',
      '.........',
      '.........',
      '.........',
      '.........',
    ])
    const mv = chooseBotMove(board, 'B', null, det)
    expect(eq(mv, 4, 5), `应逃到 (4,5),实际 ${JSON.stringify(mv)}`).toBe(true)
    expect(analyzeMove(board, mv!.x, mv!.y, 'B').selfLiberties).toBeGreaterThanOrEqual(2)
  })

  it('叫吃形:把被围的白单子直接提掉(吃子优先级最高)', () => {
    // 白 (1,1) 单子,黑 (1,0)(0,1)(2,1) 三面围,白唯一气在 (1,2);黑点 (1,2) 提子
    const board = fromRows([
      '.B.......',
      'BWB......',
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
    ])
    const mv = chooseBotMove(board, 'B', null, det)
    expect(eq(mv, 1, 2), `应提白子于 (1,2),实际 ${JSON.stringify(mv)}`).toBe(true)
    expect(analyzeMove(board, 1, 2, 'B').captured.length).toBe(1)
  })

  it('不自填真眼:轮到自己也绝不填掉己方的眼', () => {
    const board = fromRows([
      '.........',
      '.BBB.....',
      '.B.B.....',
      '.BBB.....',
      '.........',
      '.........',
      '.........',
      '.........',
      '.........',
    ])
    expect(isEyeFor(board, { x: 2, y: 2 }, 'B')).toBe(true)
    for (let i = 0; i < 20; i++) {
      expect(eq(chooseBotMove(board, 'B'), 2, 2)).toBe(false)
    }
  })

  it('永不返回非法手或无谓自送叫吃(安全闸)', () => {
    const boards = [
      fromRows([
        'WBWBWBWBW',
        'BWBWBWBWB',
        '.........',
        '...BW....',
        '...WB....',
        '.........',
        'WBWBWBWBW',
        'BWBWBWBWB',
        '.........',
      ]),
      fromRows([
        '....B....',
        '...B.B...',
        '..B.W.B..',
        '...B.B...',
        '....B....',
        '.........',
        '..WWW....',
        '..W.W....',
        '..WWW....',
      ]),
    ]
    for (const board of boards) {
      for (const color of ['B', 'W'] as Stone[]) {
        for (let i = 0; i < 30; i++) {
          const mv = chooseBotMove(board, color)
          if (mv === null) continue
          const a = analyzeMove(board, mv.x, mv.y, color)
          expect(a.legal, `(${mv.x},${mv.y}) 必须合法`).toBe(true)
          expect(isEyeFor(board, mv, color)).toBe(false)
          if (a.captured.length === 0) {
            expect(a.selfLiberties, '非吃子手落后不得仅剩 1 气').toBeGreaterThanOrEqual(2)
          }
        }
      }
    }
  })

  it('终局停一手:地界已分、只剩自家空时 pass', () => {
    // 黑墙 x=4、白墙 x=5,左右各自成空 —— 没有好点可下,机器人应 pass
    const board = fromRows([
      '....BW...',
      '....BW...',
      '....BW...',
      '....BW...',
      '....BW...',
      '....BW...',
      '....BW...',
      '....BW...',
      '....BW...',
    ])
    expect(chooseBotMove(board, 'B')).toBe(null)
    expect(chooseBotMove(board, 'W')).toBe(null)
  })

  it('开局占角:空盘上第一手落在角部/第三线一带,不挤在中央或一线', () => {
    const empty = fromRows(Array(9).fill('.........'))
    const mv = chooseBotMove(empty, 'B', null, det)
    expect(mv).not.toBe(null)
    const line = Math.min(mv!.x, mv!.y, 8 - mv!.x, 8 - mv!.y)
    expect(line, '开局应走第三线(line=2)附近').toBeGreaterThanOrEqual(2)
  })
})
