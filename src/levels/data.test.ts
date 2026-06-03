import { describe, it, expect } from 'vitest'
import { LEVELS } from './data'
import { analyzeMove, createBoard } from '../engine/board'
import type { Board, Point } from '../engine/types'
import type { Level } from './types'

function build(level: Level): Board {
  const cells = createBoard(level.boardSize).cells.slice()
  for (const s of level.stones) cells[s.y * level.boardSize + s.x] = s.c
  return { size: level.boardSize, cells }
}

describe('关卡正解校验', () => {
  for (const level of LEVELS) {
    if (level.goal.kind === 'place-any-legal') continue

    it(`${level.id}「${level.title}」正解点应合法且按预期吃子`, () => {
      const board = build(level)

      let pt: Point | undefined
      if (level.goal.kind === 'points') pt = level.goal.points[0]
      else pt = level.hintPoints?.[0] // capture / tree 关用提示点作为代表正解

      expect(pt, '应能找到一个用于校验的正解点').toBeDefined()
      const a = analyzeMove(board, pt!.x, pt!.y, level.toPlay)
      expect(a.legal, '正解点必须是合法落子').toBe(true)

      if (level.goal.kind === 'capture') {
        expect(a.captured.length).toBeGreaterThanOrEqual(level.goal.min ?? 1)
      }
      if (level.goal.kind === 'points') {
        // 第一批 points 关都是吃子关,正解应至少提到 1 子
        expect(a.captured.length).toBeGreaterThan(0)
      }
    })
  }
})
