import { describe, it, expect } from 'vitest'
import { createBoard } from './board'
import { attackerCanKill, isAlive, isEyeFor, trueEyeCount } from './lifedeath'
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

describe('真眼 / 假眼判定(对角规则)', () => {
  // 正中的眼点 (4,4):直邻全黑;对角按需摆放
  function centerEye(diag: S[]): Board {
    return mk([
      { x: 3, y: 4, c: 'B' }, { x: 5, y: 4, c: 'B' }, { x: 4, y: 3, c: 'B' }, { x: 4, y: 5, c: 'B' },
      ...diag,
    ])
  }
  const D = { tl: { x: 3, y: 3 }, tr: { x: 5, y: 3 }, bl: { x: 3, y: 5 }, br: { x: 5, y: 5 } }

  it('正中:四角全己方 → 真眼', () => {
    const b = centerEye([
      { ...D.tl, c: 'B' }, { ...D.tr, c: 'B' }, { ...D.bl, c: 'B' }, { ...D.br, c: 'B' },
    ])
    expect(isEyeFor(b, { x: 4, y: 4 }, 'B')).toBe(true)
  })

  it('正中:仅一个角是敌子 → 仍是真眼(允许 1 个坏角)', () => {
    const b = centerEye([
      { ...D.tl, c: 'W' }, { ...D.tr, c: 'B' }, { ...D.bl, c: 'B' }, { ...D.br, c: 'B' },
    ])
    expect(isEyeFor(b, { x: 4, y: 4 }, 'B')).toBe(true)
  })

  it('正中:两个角是敌子 → 假眼', () => {
    const b = centerEye([
      { ...D.tl, c: 'W' }, { ...D.br, c: 'W' }, { ...D.tr, c: 'B' }, { ...D.bl, c: 'B' },
    ])
    expect(isEyeFor(b, { x: 4, y: 4 }, 'B')).toBe(false)
  })

  it('边/角:任一对角不归己方 → 假眼(边上要求更严)', () => {
    // 顶边眼点 (4,0):直邻 (3,0)(5,0)(4,1) 全黑;在盘内对角 (3,1)(5,1)
    const real = mk([
      { x: 3, y: 0, c: 'B' }, { x: 5, y: 0, c: 'B' }, { x: 4, y: 1, c: 'B' },
      { x: 3, y: 1, c: 'B' }, { x: 5, y: 1, c: 'B' },
    ])
    expect(isEyeFor(real, { x: 4, y: 0 }, 'B')).toBe(true)
    const fake = mk([
      { x: 3, y: 0, c: 'B' }, { x: 5, y: 0, c: 'B' }, { x: 4, y: 1, c: 'B' },
      { x: 3, y: 1, c: 'W' }, { x: 5, y: 1, c: 'B' }, // 一个对角是敌子 → 边上即假眼
    ])
    expect(isEyeFor(fake, { x: 4, y: 0 }, 'B')).toBe(false)
  })

  it('一真眼 + 一假眼 ≠ 两眼活(旧的"只看直邻"会误判为活)', () => {
    // 黑块顶边围出两个直邻全封的空:(1,0) 是真眼,(3,0) 因对角 (4,1) 是白 → 假眼。
    const b = mk([
      { x: 0, y: 0, c: 'B' }, { x: 2, y: 0, c: 'B' }, { x: 4, y: 0, c: 'B' },
      { x: 0, y: 1, c: 'B' }, { x: 1, y: 1, c: 'B' }, { x: 2, y: 1, c: 'B' }, { x: 3, y: 1, c: 'B' },
      { x: 4, y: 1, c: 'W' }, // 顶在 (3,0) 的对角上 → (3,0) 成假眼
    ])
    expect(isEyeFor(b, { x: 1, y: 0 }, 'B')).toBe(true) // 真眼
    expect(isEyeFor(b, { x: 3, y: 0 }, 'B')).toBe(false) // 假眼
    expect(trueEyeCount(b, 1, 1)).toBe(1)
    expect(isAlive(b, 1, 1)).toBe(false) // 只有一只真眼 → 不算活
  })

  it('弯三两眼:相邻共享的空对角点不误判为假眼', () => {
    // 角部黑弯三做活:眼位 (0,0) 已被己方占,留 (1,0)(0,1) 两眼,彼此互为空对角
    const b = mk([
      { x: 0, y: 0, c: 'B' }, { x: 1, y: 1, c: 'B' }, { x: 2, y: 0, c: 'B' },
      { x: 2, y: 1, c: 'B' }, { x: 0, y: 2, c: 'B' }, { x: 1, y: 2, c: 'B' },
    ])
    // (1,0):直邻 (0,0)B (2,0)B (1,1)B;空对角 (0,1) 其直邻全黑 → 受控 → 真眼
    expect(isEyeFor(b, { x: 1, y: 0 }, 'B')).toBe(true)
    expect(isEyeFor(b, { x: 0, y: 1 }, 'B')).toBe(true)
    expect(trueEyeCount(b, 1, 1)).toBe(2)
    expect(isAlive(b, 1, 1)).toBe(true)
  })
})
