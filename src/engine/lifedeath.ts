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

function diagNeighbors(size: number, x: number, y: number): Point[] {
  const pts: Point[] = []
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const nx = x + dx
    const ny = y + dy
    if (nx >= 0 && nx < size && ny >= 0 && ny < size) pts.push({ x: nx, y: ny })
  }
  return pts
}

/** 该点的所有在盘内直邻是否都是 color(眼的"形")。 */
function orthoAllFriendly(board: Board, p: Point, color: Stone): boolean {
  for (const n of orthoNeighbors(board.size, p.x, p.y)) {
    if (getCell(board, n.x, n.y) !== color) return false
  }
  return true
}

/**
 * 一个点是否是 color 的**真眼**(而非假眼)。判定:
 *  1. 该点为空,且所有在盘内的直邻都是 color 的子(眼的基本形);
 *  2. 对角控制:统计在盘内的对角点中"不归 color 掌控"的个数 bad —— 对角是敌子、
 *     或是空点且其直邻并非全为 color(即不是一只己方眼)都算 bad;
 *     角/边(在盘内对角 < 4 个)要求 bad === 0,正中(4 个对角)允许 bad ≤ 1。
 * 这条对角规则能把"假眼"判出来,同时不会把弯三那种**相邻共享对角的两只真眼**误杀
 * (彼此的空对角点其直邻全是己方,算受控)。这是一只眼"做得活/破不掉"的保守证书。
 */
export function isEyeFor(board: Board, p: Point, color: Stone): boolean {
  if (getCell(board, p.x, p.y) !== null) return false
  if (!orthoAllFriendly(board, p, color)) return false

  const diags = diagNeighbors(board.size, p.x, p.y)
  let bad = 0
  for (const d of diags) {
    const c = getCell(board, d.x, d.y)
    if (c === color) continue // 己子,受控
    if (c !== null) {
      bad++ // 敌子
      continue
    }
    // 空对角:若它本身被己方直邻包住(也是一只己方眼形)则受控,否则算 bad
    if (!orthoAllFriendly(board, d, color)) bad++
  }
  const onEdge = diags.length < 4
  return onEdge ? bad === 0 : bad <= 1
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
  /** 防御性兜底:访问节点数上限,绝不挂死(正常死活题远到不了) */
  budget: number
}

function key(board: Board, toMove: Stone): string {
  return toMove + board.cells.join('')
}

/**
 * 攻方最优下能否净杀目标块?toMove 指当前轮到谁落子。
 * 落子点(眼位区域)在每个节点按当前盘面**动态重算** —— 这样"扑入 + 回提"
 * 让眼位点重新变空后,双方仍能在新空点上继续手筋。
 * 返回 true = 攻方能净杀(目标死);false = 杀不掉(目标活/攻方无法取得进展)。
 *
 * 关于缓存(刻意不做):死活搜索是图历史相关(GHI)的 —— 同一盘面经不同祖先
 * 路径到达,结论会因"路径判重(劫/循环提子)"而不同。置换表只能正确缓存与路径
 * 无关的"终局点"(被提/两眼/无气),而那些本就秒算;掺了路径判重的内部结论一旦
 * 缓存就会被另一条路径错误复用(实测会把"直三黑先净杀"误判成活)。眼位区域有
 * REGION_CAP 上限、又有 budget 硬节点上限,搜索恒定廉价,无需缓存。
 */
function killSearch(board: Board, toMove: Stone, st: KillState): boolean {
  const defender = opponent(st.attacker)
  // 目标已被提走 → 死
  if (getCell(board, st.targetRef.x, st.targetRef.y) !== defender) return true
  // 目标已有两只真眼 → 活,杀不掉
  if (isAlive(board, st.targetRef.x, st.targetRef.y)) return false

  // 路径上的重复局面 / 超出节点预算 → 攻方无法取得进展,判作"杀不掉"(保守偏活)
  const k = key(board, toMove)
  if (st.inPath.has(k)) return false
  if (st.budget-- <= 0) return false
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
    budget: 200000,
  }
  return killSearch(board, toMove, st)
}
