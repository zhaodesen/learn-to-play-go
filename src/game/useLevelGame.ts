// 关卡进行中的状态机:管理落子、正解判定、系统应手、提示与星级。
import { useState } from 'react'
import type { Level, SolutionNode } from '../levels/types'
import type { Board, Point, Stone } from '../engine/types'
import { analyzeMove, createBoard, opponent, placeStone } from '../engine/board'

export type LevelStatus = 'playing' | 'won'

export interface Feedback {
  type: 'idle' | 'wrong' | 'illegal' | 'won'
  message?: string
}

function buildBoard(level: Level): Board {
  const cells = createBoard(level.boardSize).cells.slice()
  for (const s of level.stones) cells[s.y * level.boardSize + s.x] = s.c
  return { size: level.boardSize, cells }
}

function inList(pts: Point[], x: number, y: number): boolean {
  return pts.some((p) => p.x === x && p.y === y)
}

function computeStars(hintUsed: boolean, wrong: number): number {
  if (!hintUsed && wrong === 0) return 3
  if (wrong <= 2) return 2
  return 1
}

export interface UseLevelGame {
  board: Board
  toPlay: Stone
  koPoint: Point | null
  status: LevelStatus
  feedback: Feedback
  lastMove: Point | null
  hintActive: boolean
  hintPoints: Point[]
  stars: number
  play: (x: number, y: number) => void
  reset: () => void
  showHint: () => void
}

/**
 * 管理单个关卡的一局游戏。换关卡时请给使用它的组件设置 key={level.id},
 * 让 hook 随组件重新挂载、状态自动重置。
 * @param onWin 过关回调,参数为本次获得的星级(1~3)
 * @param onPlayResult 每次有效交互的结果回调,供上层播放音效("place" | "capture" | "wrong" | "win")
 */
export function useLevelGame(
  level: Level,
  onWin?: (stars: number) => void,
  onPlayResult?: (kind: 'place' | 'capture' | 'wrong' | 'win') => void,
): UseLevelGame {
  const toPlay = level.toPlay
  const [board, setBoard] = useState<Board>(() => buildBoard(level))
  const [ko, setKo] = useState<Point | null>(null)
  const [status, setStatus] = useState<LevelStatus>('playing')
  const [feedback, setFeedback] = useState<Feedback>({ type: 'idle' })
  const [lastMove, setLastMove] = useState<Point | null>(null)
  const [node, setNode] = useState<SolutionNode | null>(
    level.goal.kind === 'tree' ? level.goal.root : null,
  )
  const [hintActive, setHintActive] = useState(false)
  const [hintPoints, setHintPoints] = useState<Point[]>([])
  const [hintUsed, setHintUsed] = useState(false)
  const [wrong, setWrong] = useState(0)
  const [stars, setStars] = useState(0)

  function reset() {
    setBoard(buildBoard(level))
    setKo(null)
    setStatus('playing')
    setFeedback({ type: 'idle' })
    setLastMove(null)
    setNode(level.goal.kind === 'tree' ? level.goal.root : null)
    setHintActive(false)
    setHintPoints([])
    setHintUsed(false)
    setWrong(0)
    setStars(0)
  }

  function finishWin(finalBoard: Board, last: Point) {
    const s = computeStars(hintUsed, wrong)
    setBoard(finalBoard)
    setLastMove(last)
    setStatus('won')
    setStars(s)
    setFeedback({ type: 'won', message: level.successText })
    onWin?.(s)
    onPlayResult?.('win')
  }

  function markWrong(msg: string) {
    setWrong((w) => w + 1)
    setFeedback({ type: 'wrong', message: msg })
    onPlayResult?.('wrong')
  }

  function play(x: number, y: number) {
    if (status === 'won') return

    const a = analyzeMove(board, x, y, toPlay, ko)
    if (!a.legal) {
      const msg =
        a.error === 'occupied'
          ? '这里已经有棋子了。'
          : a.error === 'suicide'
            ? '这里是禁入点 —— 下下去自己一口气都没有,不能下。'
            : a.error === 'ko'
              ? '正在打劫,这一手不能马上提回来,先在别处下一手。'
              : '这里不能下。'
      setFeedback({ type: 'illegal', message: msg })
      return
    }

    const r = placeStone(board, x, y, toPlay, ko)
    if (!r.ok || !r.board) return
    setHintActive(false)
    setHintPoints([])

    const goal = level.goal
    const captured = r.captured ?? []

    if (goal.kind === 'place-any-legal') {
      onPlayResult?.('place')
      finishWin(r.board, { x, y })
      return
    }

    if (goal.kind === 'capture') {
      if (captured.length >= (goal.min ?? 1)) {
        onPlayResult?.('capture')
        finishWin(r.board, { x, y })
      } else {
        markWrong('这一手没吃到子。看看对方哪一块只剩最后一口气,堵住它。')
      }
      return
    }

    if (goal.kind === 'points') {
      if (inList(goal.points, x, y)) {
        onPlayResult?.(captured.length > 0 ? 'capture' : 'place')
        finishWin(r.board, { x, y })
      } else {
        markWrong('不是这一手,再想想~')
      }
      return
    }

    // goal.kind === 'tree'
    if (node) {
      if (!inList(node.answers, x, y)) {
        markWrong('这一手不对,换个点试试。')
        return
      }
      onPlayResult?.(captured.length > 0 ? 'capture' : 'place')

      if (!node.next) {
        finishWin(r.board, { x, y })
        return
      }

      // 玩家走对,系统(对方)应一手,再把局面交回玩家
      let nextBoard = r.board
      let nextKo = r.koPoint ?? null
      let last: Point = { x, y }
      if (node.reply) {
        const rr = placeStone(r.board, node.reply.x, node.reply.y, opponent(toPlay), r.koPoint)
        if (rr.ok && rr.board) {
          nextBoard = rr.board
          nextKo = rr.koPoint ?? null
          last = node.reply
        }
      }
      setBoard(nextBoard)
      setKo(nextKo)
      setLastMove(last)
      setNode(node.next)
      setFeedback({ type: 'idle' })
    }
  }

  function showHint() {
    setHintUsed(true)
    setHintActive(true)
    const goal = level.goal
    let pts: Point[] = []
    if (level.hintPoints && level.hintPoints.length > 0) pts = level.hintPoints
    else if (goal.kind === 'points') pts = goal.points
    else if (goal.kind === 'tree' && node) pts = node.answers
    setHintPoints(pts)
    setFeedback({ type: 'idle', message: level.hint ?? '试试高亮的位置。' })
  }

  return {
    board,
    toPlay,
    koPoint: ko,
    status,
    feedback,
    lastMove,
    hintActive,
    hintPoints,
    stars,
    play,
    reset,
    showHint,
  }
}
