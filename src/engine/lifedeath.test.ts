import { describe, it, expect } from 'vitest'
import { createBoard } from './board'
import { attackerCanKill, isAlive, trueEyeCount } from './lifedeath'
import type { Board, Stone } from './types'

type S = { x: number; y: number; c: Stone }
function mk(stones: S[], size = 9): Board {
  const cells = createBoard(size).cells.slice()
  for (const s of stones) cells[s.y * size + s.x] = s.c
  return { size, cells }
}

// 顶边眼位:眼位是 (1,0)..(n,0) 的一排空点;白块沿 y=1 整排 + 两端封口把眼位兜住,
// 黑墙在南面 y=2 与东侧把白整块完全围死,使白唯一的气恰好 = 这 n 个眼位点。
function topEyespace(n: number): { board: Board; whiteRep: { x: number; y: number } } {
  const stones: S[] = []
  stones.push({ x: 0, y: 0, c: 'W' }) // 左封口
  stones.push({ x: n + 1, y: 0, c: 'W' }) // 右封口
  for (let x = 0; x <= n + 1; x++) {
    stones.push({ x, y: 1, c: 'W' }) // 白底排
    stones.push({ x, y: 2, c: 'B' }) // 黑南墙
  }
  stones.push({ x: n + 2, y: 0, c: 'B' }) // 黑东墙
  stones.push({ x: n + 2, y: 1, c: 'B' })
  // (1,0)..(n,0) 留空 = 眼位
  return { board: mk(stones), whiteRep: { x: 1, y: 1 } }
}

describe('死活求解器自检', () => {
  it('两只真眼 → 活,杀不掉', () => {
    // 直三眼位 (1,0)(2,0)(3,0),白先填中点 (2,0) → 做成 (1,0)、(3,0) 两只独立真眼
    const { board } = topEyespace(3)
    const cells = board.cells.slice()
    cells[0 * 9 + 2] = 'W' // (2,0)=W
    const alive: Board = { size: 9, cells }
    expect(trueEyeCount(alive, 1, 1)).toBe(2)
    expect(isAlive(alive, 1, 1)).toBe(true)
    expect(attackerCanKill(alive, 1, 1, 'B', 'B')).toBe(false)
  })

  it('直三 → 谁先占中点谁赢(黑先杀、白先活)', () => {
    const { board, whiteRep } = topEyespace(3)
    expect(attackerCanKill(board, whiteRep.x, whiteRep.y, 'B', 'B')).toBe(true) // 黑先 → 死
    expect(attackerCanKill(board, whiteRep.x, whiteRep.y, 'B', 'W')).toBe(false) // 白先 → 活
  })

  it('直二 → 只有一只眼,必死(谁先都杀得掉)', () => {
    const { board, whiteRep } = topEyespace(2)
    expect(attackerCanKill(board, whiteRep.x, whiteRep.y, 'B', 'B')).toBe(true)
    expect(attackerCanKill(board, whiteRep.x, whiteRep.y, 'B', 'W')).toBe(true)
  })

  it('直四 → 活棋(黑先也杀不掉)', () => {
    const { board, whiteRep } = topEyespace(4)
    expect(attackerCanKill(board, whiteRep.x, whiteRep.y, 'B', 'B')).toBe(false)
  })
})
