// 9 路规则机器人(纯启发式,非神经网络 / 非 MCTS)。
// 设计为「会下基本棋的弱对手」,正好给入门玩家当陪练:会吃子、会逃子、会叫吃、
// 懂占角占边、不自填眼、不自杀送死。完全用规则打分,可解释、可调、可单测。
//
// 用法:chooseBotMove(board, color, koPoint?) → 落子点;返回 null 表示「停一手(pass)」。
import type { Board, Point, Stone } from './types'
import { analyzeMove, getCell, getGroup, opponent, placeStone, pointKey } from './board'
import { isEyeFor } from './lifedeath'

export interface BotOptions {
  /** 可注入的随机源(0~1),便于测试复现;默认 Math.random */
  random?: () => number
  /** 同分时的随机扰动幅度,越大走法越多变(默认 0.5) */
  jitter?: number
}

/** 一个点到最近棋盘边的"线数":0=第一线(边上),1=第二线,2=第三线… */
function lineOf(size: number, x: number, y: number): number {
  return Math.min(x, y, size - 1 - x, size - 1 - y)
}

function orthoNeighbors(size: number, x: number, y: number): Point[] {
  const pts: Point[] = []
  if (x > 0) pts.push({ x: x - 1, y })
  if (x < size - 1) pts.push({ x: x + 1, y })
  if (y > 0) pts.push({ x, y: y - 1 })
  if (y < size - 1) pts.push({ x, y: y + 1 })
  return pts
}

/** 统计盘面上某色的棋子数,用于区分开局/中盘 */
function stoneCount(board: Board): number {
  let n = 0
  for (const c of board.cells) if (c !== null) n++
  return n
}

/**
 * (x,y) 所在的空白区域边界都贴着哪种颜色。
 * 用来判断这个点是不是已经在"某方围死的地"里 —— 往自己围好的空里填子毫无价值,
 * 是机器人该 pass(而非乱填)的信号。
 */
function regionTouch(board: Board, x: number, y: number): { b: boolean; w: boolean; walls: number } {
  const size = board.size
  const seen = new Uint8Array(size * size)
  const wallSeen = new Uint8Array(size * size)
  let b = false
  let w = false
  let walls = 0 // 区域边界上的棋子数(去重)—— 用来区分"真被墙围死的地" vs "开局空旷处"
  const stack: Point[] = [{ x, y }]
  seen[y * size + x] = 1
  while (stack.length > 0) {
    const p = stack.pop() as Point
    for (const n of orthoNeighbors(size, p.x, p.y)) {
      const ni = n.y * size + n.x
      const c = getCell(board, n.x, n.y)
      if (c === 'B' || c === 'W') {
        if (c === 'B') b = true
        else w = true
        if (wallSeen[ni] === 0) {
          wallSeen[ni] = 1
          walls++
        }
      } else if (seen[ni] === 0) {
        seen[ni] = 1
        stack.push(n)
      }
    }
  }
  return { b, w, walls }
}

/**
 * 给"在 (x,y) 落 color 子"这一手打分。分越高越想下。
 * 各启发式权重经手调,确保:吃子/救险 > 叫吃 > 占边角连接 > 单纯贴补。
 * 返回 -Infinity 表示这一手要被否决(非法 / 自填眼 / 无谓自送)。
 */
function scoreMove(
  board: Board,
  x: number,
  y: number,
  color: Stone,
  koPoint: Point | null,
): number {
  const size = board.size
  const a = analyzeMove(board, x, y, color, koPoint)
  if (!a.legal) return -Infinity

  // 安全闸 ②:不填自己的真眼(会自损,弱棋也不能这么蠢)
  if (isEyeFor(board, { x, y }, color)) return -Infinity

  // 安全闸 ③:落子后自己只剩 1 口气、且这一手没提到子 = 无谓自送叫吃,否决
  if (a.selfLiberties <= 1 && a.captured.length === 0) return -Infinity

  let score = 1 // 基础分:合法且不犯傻

  // 1) 吃子:能提子最优先,提得越多越好
  if (a.captured.length > 0) score += 50 + a.captured.length * 12

  // 用落子后的棋盘判断"救险/叫吃"等需要看结果的启发式
  const r = placeStone(board, x, y, color, koPoint)
  const after = r.ok && r.board ? r.board : null
  const opp = opponent(color)

  if (after) {
    // 2) 救险:落子前我方若有相邻的"只剩 1 气"的块,落子后这块气数变多 = 救活了
    const before = board
    for (const n of orthoNeighbors(size, x, y)) {
      if (getCell(before, n.x, n.y) === color) {
        const g0 = getGroup(before, n.x, n.y)
        if (g0 && g0.liberties.length === 1) {
          const g1 = getGroup(after, x, y) // 落子后含 (x,y) 的整块
          if (g1 && g1.liberties.length >= 2) {
            score += 18 + g0.stones.length * 6 // 救得越大越值
          }
        }
      }
    }

    // 3) 叫吃:把对方某块逼到只剩 1 气(且没立刻提掉)
    const seenOpp = new Set<string>()
    for (const n of orthoNeighbors(size, x, y)) {
      if (getCell(after, n.x, n.y) !== opp) continue
      const g = getGroup(after, n.x, n.y)
      if (!g) continue
      const key = pointKey(g.stones[0])
      if (seenOpp.has(key)) continue
      seenOpp.add(key)
      if (g.liberties.length === 1) score += 10 + g.stones.length * 4
    }
  }

  // 这个点是不是已经在"某一方围死的空"里?是的话填子毫无价值 —— 不加任何位置分,
  // 让它低于 pass 阈值,促使机器人在终局停手(而不是往自家空里乱填)。
  // 真正"被围死的地":区域只贴一方,且有足够多的墙(≥4 子)把它合围。
  // 仅靠 1~2 颗子贴边的大空属于开局空旷处,不算地 —— 否则机器人开局就误判成"无处可下"而 pass。
  const t = regionTouch(board, x, y)
  const sealed = t.b !== t.w && t.walls >= 4
  if (sealed) return score

  // 4) 自身气数:落子后这块越宽越安全(轻微偏好,别挤成一坨)
  if (after) {
    const self = getGroup(after, x, y)
    if (self) score += Math.min(self.liberties.length, 5) * 0.6
  }

  // 5) 占边角(金角银边):偏好第三线 / 角部,避开一二线和正中堆子
  const line = lineOf(size, x, y)
  if (line === 2) score += 3
  else if (line === 3) score += 1.5
  else if (line === 0) score -= 1.5 // 一线太低效
  const center = (size - 1) / 2
  const distCenter = Math.abs(x - center) + Math.abs(y - center)

  // 6) 贴近已有棋子:别零散乱撒,围棋讲究连片(中盘后更重要)
  let nearFriend = false
  let nearFoe = false
  for (const n of orthoNeighbors(size, x, y)) {
    const c = getCell(board, n.x, n.y)
    if (c === color) nearFriend = true
    else if (c === opp) nearFoe = true
  }
  if (nearFriend) score += 1.2 // 连接 / 加固
  if (nearFoe) score += 0.8 // 接触战 / 压迫

  // 开局阶段(子很少时)鼓励占角,别一上来挤中央
  if (stoneCount(board) < 8) {
    if (line === 2) score += 2
    score -= distCenter * 0.05
  }

  return score
}

/**
 * 机器人选点。遍历所有空点打分,取最高分;若最高分仍很低(只剩贴补/单官),则停一手。
 * @returns 落子点;null 表示 pass。
 */
export function chooseBotMove(
  board: Board,
  color: Stone,
  koPoint: Point | null = null,
  opts: BotOptions = {},
): Point | null {
  const rng = opts.random ?? Math.random
  const jitter = opts.jitter ?? 0.5
  const size = board.size

  let best: Point | null = null
  let bestScore = -Infinity

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (getCell(board, x, y) !== null) continue
      const base = scoreMove(board, x, y, color, koPoint)
      if (base === -Infinity) continue
      const s = base + rng() * jitter
      if (s > bestScore) {
        bestScore = s
        best = { x, y }
      }
    }
  }

  // 收尾:若所有走法都只值"基础分上下"(没有吃子/叫吃/占地等正收益),
  // 说明该收的都收完了 —— 停一手,让对局进入终局数子。
  const PASS_THRESHOLD = 2.5
  if (best === null || bestScore < PASS_THRESHOLD) return null
  return best
}
