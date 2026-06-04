// 死活求解器(有界穷举):用于关卡校验,证明"急所"确实是做活/点杀的命门。
// 思路与第 3 章对杀搜索器一致 —— 在目标块被围出的小眼位区域里,攻防双方交替穷举:
//   · 攻方(attacker)想把目标整块提掉;
//   · 防守方(目标块的主人)想做出两只真眼活棋。
// 终局判定:目标被提 → 死;目标已有 ≥2 只真眼 → 活。区域很小(≤ ~8 个空点),可暴力穷举。
//
// 注:这是关卡校验/未来机器人共用的纯规则资产,App 运行时并不直接依赖。
import type { Board, GroupInfo, Point, Stone } from './types'
import { getCell, getGroup, opponent, placeStone } from './board'

function orthoNeighbors(size: number, x: number, y: number): Point[] {
  const pts: Point[] = []
  if (x > 0) pts.push({ x: x - 1, y })
  if (x < size - 1) pts.push({ x: x + 1, y })
  if (y > 0) pts.push({ x, y: y - 1 })
  if (y < size - 1) pts.push({ x, y: y + 1 })
  return pts
}

/**
 * 一个点是否是 color 的"真眼":该点为空,且其所有在盘内的上下左右邻居都是 color 的子。
 * (只看直邻、不严格判对角假眼;关卡棋形会保证眼的边角结实,不出现假眼陷阱。)
 */
export function isEyeFor(board: Board, p: Point, color: Stone): boolean {
  if (getCell(board, p.x, p.y) !== null) return false
  for (const n of orthoNeighbors(board.size, p.x, p.y)) {
    if (getCell(board, n.x, n.y) !== color) return false
  }
  return true
}

/** 目标块拥有的真眼数(去重)。 */
export function trueEyeCount(board: Board, x: number, y: number): number {
  const g = getGroup(board, x, y)
  if (!g) return 0
  const color = getCell(board, x, y) as Stone
  const seen = new Set<string>()
  for (const s of g.stones) {
    for (const n of orthoNeighbors(board.size, s.x, s.y)) {
      const key = `${n.x},${n.y}`
      if (seen.has(key)) continue
      if (isEyeFor(board, n, color)) seen.add(key)
    }
  }
  return seen.size
}

/** 两眼即活。 */
export function isAlive(board: Board, x: number, y: number): boolean {
  return trueEyeCount(board, x, y) >= 2
}

/**
 * 目标块被围出的"眼位区域":从目标块的气出发,穿过空点与目标自身的子洪水扩散,
 * 被攻方的子或棋盘边挡住。返回区域内所有空点。
 * 若区域过大(目标没被围死,泄漏到开阔处)则返回 null —— 视作无法净杀。
 */
function eyeRegion(board: Board, target: GroupInfo, attacker: Stone): Point[] | null {
  const defender = opponent(attacker)
  const size = board.size
  const visited = new Uint8Array(size * size)
  const empties: Point[] = []
  const stack: Point[] = [...target.liberties]
  for (const lib of target.liberties) visited[lib.y * size + lib.x] = 1

  const REGION_CAP = 12
  while (stack.length > 0) {
    const p = stack.pop() as Point
    const c = getCell(board, p.x, p.y)
    if (c === null) {
      empties.push(p)
      if (empties.length > REGION_CAP) return null // 没被围住,放弃净杀
    }
    for (const n of orthoNeighbors(size, p.x, p.y)) {
      const ni = n.y * size + n.x
      if (visited[ni]) continue
      const nc = getCell(board, n.x, n.y)
      // 穿过空点和防守方自己的子;遇到攻方的子停下(那是围墙)
      if (nc === attacker) continue
      visited[ni] = 1
      if (nc === null || nc === defender) stack.push(n)
    }
  }
  return empties
}

interface KillState {
  inPath: Set<string>
  attacker: Stone
  targetRef: Point
}

function key(board: Board, toMove: Stone): string {
  return toMove + board.cells.join('')
}

/**
 * 攻方最优下能否净杀目标块?toMove 指当前轮到谁落子。
 * 落子点(眼位区域)在每个节点按当前盘面**动态重算** —— 这样"扑入 + 回提"
 * 让眼位点重新变空后,双方仍能在新空点上继续手筋。
 * 返回 true = 攻方能净杀(目标死);false = 杀不掉(目标活/攻方无法取得进展)。
 */
function killSearch(board: Board, toMove: Stone, st: KillState): boolean {
  const defender = opponent(st.attacker)
  // 目标已被提走 → 死
  if (getCell(board, st.targetRef.x, st.targetRef.y) !== defender) return true
  // 目标已有两只真眼 → 活,杀不掉
  if (isAlive(board, st.targetRef.x, st.targetRef.y)) return false

  // 路径上的重复局面:攻方无法靠循环取得进展 → 判作杀不掉(活)。
  // 注:这里只用"当前搜索路径"判重、不做跨路径的置换表缓存 —— 死活搜索是
  // 图历史相关的(graph-history interaction),缓存路径相关的结论会出错;
  // 眼位区域很小(≤ ~6 点),不缓存也足够快。
  const k = key(board, toMove)
  if (st.inPath.has(k)) return false
  st.inPath.add(k)

  // 当前目标块被围出的眼位空点(动态);若已不被围死则攻方杀不净
  const target = getGroup(board, st.targetRef.x, st.targetRef.y)
  const open = target ? eyeRegion(board, target, st.attacker) : null

  let result: boolean
  if (open === null) {
    result = false // 没围住 → 杀不掉
  } else if (toMove === st.attacker) {
    // 攻方:任一手能杀即成立
    result = false
    for (const m of open) {
      const r = placeStone(board, m.x, m.y, st.attacker)
      if (!r.ok || !r.board) continue
      if (killSearch(r.board, defender, st)) {
        result = true
        break
      }
    }
  } else {
    // 防守方:只要有一手(或停一手)能活,就不被杀
    result = true
    // 停一手:把手交回攻方(同一盘面)。若攻方仍杀不掉,则防守方活。
    if (!killSearch(board, st.attacker, st)) {
      result = false
    } else {
      for (const m of open) {
        const r = placeStone(board, m.x, m.y, defender)
        if (!r.ok || !r.board) continue
        if (!killSearch(r.board, st.attacker, st)) {
          result = false
          break
        }
      }
    }
  }

  st.inPath.delete(k)
  return result
}

/**
 * 攻方 attacker 先手(或由 toMove 指定),最优下能否净杀 (tx,ty) 所在的目标块。
 * 返回 true = 能净杀(目标死);false = 杀不掉(目标活)。
 */
export function attackerCanKill(
  board: Board,
  tx: number,
  ty: number,
  attacker: Stone,
  toMove: Stone = attacker,
): boolean {
  if (getCell(board, tx, ty) !== opponent(attacker)) return false // 目标不是攻方对手的子
  const st: KillState = {
    inPath: new Set(),
    attacker,
    targetRef: { x: tx, y: ty },
  }
  return killSearch(board, toMove, st)
}
