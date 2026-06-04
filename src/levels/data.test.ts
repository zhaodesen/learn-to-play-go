import { describe, it, expect } from 'vitest'
import { LEVELS } from './data'
import { analyzeMove, createBoard, getCell, opponent, placeStone } from '../engine/board'
import { attackerCanKill, isAlive } from '../engine/lifedeath'
import type { Board, Point, Stone } from '../engine/types'
import type { Level, SolutionNode } from './types'

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

      if (level.goal.kind === 'tree') return // 多步题单独逐手核对(见下)
      if (level.lifeDeath) return // 死活关用求解器单独校验(见下)

      let pt: Point | undefined
      if (level.goal.kind === 'points') pt = level.goal.points[0]
      else pt = level.hintPoints?.[0] // capture 关用提示点作为代表正解

      expect(pt, '应能找到一个用于校验的正解点').toBeDefined()
      const a = analyzeMove(board, pt!.x, pt!.y, level.toPlay)
      expect(a.legal, '正解点必须是合法落子').toBe(true)

      if (level.goal.kind === 'capture') {
        expect(a.captured.length).toBeGreaterThanOrEqual(level.goal.min ?? 1)
      }
      if (level.goal.kind === 'points') {
        if (level.expectNoCapture) {
          // 逃子/占点类:不吃子,但落子后己方应获得更多气(真的逃出/活了)
          expect(a.selfLiberties, '逃子后应至少有 2 口气').toBeGreaterThanOrEqual(2)
        } else {
          // 吃子类 points 关,正解应至少提到 1 子
          expect(a.captured.length).toBeGreaterThan(0)
        }
      }
    })
  }
})

// 多步题(征子 / 倒扑等):严格按 useLevelGame 的流程逐手用引擎跑通整棵正解树,
// 断言每一手玩家正解合法、系统应手合法,最后一手必须真的提到子。
describe('多步正解树逐手核对', () => {
  const trees = LEVELS.filter((l) => l.goal.kind === 'tree')

  for (const level of trees) {
    it(`${level.id}「${level.title}」整条正解线应能走到底并提子`, () => {
      const me = level.toPlay
      const foe = opponent(me)
      let board = build(level)
      let ko: Point | null = null
      // goal.kind 已由上面 filter 收窄,这里安全断言
      let node: SolutionNode | undefined = (level.goal as { kind: 'tree'; root: SolutionNode }).root

      while (node) {
        const ans = node.answers[0]
        const a = analyzeMove(board, ans.x, ans.y, me, ko)
        expect(a.legal, `${level.id} 玩家正解 (${ans.x},${ans.y}) 必须合法`).toBe(true)

        const r = placeStone(board, ans.x, ans.y, me, ko)
        expect(r.ok && r.board, `${level.id} 玩家落子应成功`).toBeTruthy()
        board = r.board!
        ko = r.koPoint ?? null

        if (!node.next) {
          // 终局手:必须真的提到子
          expect(
            (r.captured?.length ?? 0),
            `${level.id} 最后一手应提子`,
          ).toBeGreaterThan(0)
          break
        }

        // 系统(对方)应手:reply 为 null/省略 表示对方无法应手(如有眼杀无眼,对方填眼/填公气都是自杀)
        if (node.reply) {
          const rep = node.reply
          const rr = placeStone(board, rep.x, rep.y, foe, ko)
          expect(rr.ok && rr.board, `${level.id} 系统应手 (${rep.x},${rep.y}) 必须合法`).toBeTruthy()
          board = rr.board!
          ko = rr.koPoint ?? null
        }
        node = node.next
      }
    })
  }
})

// 死活关:用 lifedeath 求解器穷举证明"急所唯一、下对则活/死成立"。
// - kill 关:目标(白)在黑先时被净杀;下对急所后(轮到白)白仍死;下错点白则活。
// - live 关:目标(黑,玩家自己)在白先时会被杀;下对急所后白再杀不掉(两眼活);下错点白能杀。
describe('死活关求解器校验', () => {
  const ldLevels = LEVELS.filter((l) => l.lifeDeath)

  for (const level of ldLevels) {
    it(`${level.id}「${level.title}」急所唯一且死活成立`, () => {
      const ld = level.lifeDeath!
      const board = build(level)
      const targetColor = getCell(board, ld.target.x, ld.target.y) as Stone
      const attacker = opponent(targetColor)
      expect(level.goal.kind, 'lifeDeath 关应为 points 型').toBe('points')
      const vital = (level.goal as { kind: 'points'; points: Point[] }).points[0]

      const afterVital = (): Board => {
        const r = placeStone(board, vital.x, vital.y, level.toPlay)
        expect(r.ok && r.board, '急所应是合法落子').toBeTruthy()
        return r.board!
      }

      if (ld.verdict === 'kill') {
        // 黑先能净杀
        expect(
          attackerCanKill(board, ld.target.x, ld.target.y, attacker, attacker),
          '黑先应能净杀目标',
        ).toBe(true)
        // 下对急所后,轮到白也救不活
        const bv = afterVital()
        expect(
          attackerCanKill(bv, ld.target.x, ld.target.y, attacker, targetColor),
          '下对急所后目标仍是死棋',
        ).toBe(true)
      } else {
        // 不下这手则会被对方先点死
        expect(
          attackerCanKill(board, ld.target.x, ld.target.y, attacker, attacker),
          '对方先手应能杀掉目标(所以必须抢救)',
        ).toBe(true)
        // 下对急所后做出两眼,对方再杀不掉
        const bv = afterVital()
        expect(isAlive(bv, ld.target.x, ld.target.y), '下对急所后应是两眼活棋').toBe(true)
        expect(
          attackerCanKill(bv, ld.target.x, ld.target.y, attacker, attacker),
          '下对急所后对方应再也杀不掉',
        ).toBe(false)
      }
    })
  }
})
