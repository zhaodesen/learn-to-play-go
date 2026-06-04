import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Goban } from './Goban'
import { Taiji } from './Taiji'
import { analyzeMove, createBoard, placeStone } from '../engine/board'
import { chooseBotMove } from '../engine/bot'
import { scoreArea } from '../engine/score'
import { sound } from '../audio/sound'
import type { Board, Point, Stone } from '../engine/types'
import type { ScoreResult } from '../engine/score'
import './PlayView.css'

const SIZE = 9
const KOMI = 7
const HUMAN: Stone = 'B'
const BOT: Stone = 'W'

interface Snapshot {
  board: Board
  ko: Point | null
  lastMove: Point | null
  passes: number
  capturedByHuman: number
  capturedByBot: number
}

function freshSnapshot(): Snapshot {
  return {
    board: createBoard(SIZE),
    ko: null,
    lastMove: null,
    passes: 0,
    capturedByHuman: 0,
    capturedByBot: 0,
  }
}

type Phase = 'play' | 'over'

export function PlayView({ onExit }: { onExit: () => void }) {
  const [snap, setSnap] = useState<Snapshot>(() => freshSnapshot())
  const [turn, setTurn] = useState<Stone>(HUMAN)
  const [phase, setPhase] = useState<Phase>('play')
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [thinking, setThinking] = useState(false)
  const [note, setNote] = useState<string>('你执黑先行 —— 点击棋盘落子。')
  // 悔棋:保存「轮到人落子」时刻的快照
  const historyRef = useRef<Snapshot[]>([])

  const endGame = useCallback((finalBoard: Board, reason: string) => {
    setResult(scoreArea(finalBoard, { komi: KOMI }))
    setPhase('over')
    setNote(reason)
    sound.play('win')
  }, [])

  // 落一手(供人和机器人共用),返回是否成功
  const applyMove = useCallback(
    (s: Snapshot, x: number, y: number, color: Stone): Snapshot | null => {
      const r = placeStone(s.board, x, y, color, s.ko)
      if (!r.ok || !r.board) return null
      const cap = r.captured?.length ?? 0
      if (cap > 0) sound.play('capture')
      else sound.play('place')
      return {
        board: r.board,
        ko: r.koPoint ?? null,
        lastMove: { x, y },
        passes: 0,
        capturedByHuman: s.capturedByHuman + (color === HUMAN ? cap : 0),
        capturedByBot: s.capturedByBot + (color === BOT ? cap : 0),
      }
    },
    [],
  )

  // 人落子
  function handleHumanPlay(x: number, y: number) {
    if (phase !== 'play' || turn !== HUMAN || thinking) return
    const a = analyzeMove(snap.board, x, y, HUMAN, snap.ko)
    if (!a.legal) {
      sound.play('wrong')
      setNote(
        a.error === 'occupied'
          ? '这里已经有子了。'
          : a.error === 'ko'
            ? '打劫:这一手不能马上提回,先在别处下。'
            : a.error === 'suicide'
              ? '这里是禁入点(下完自己没气),不能下。'
              : '这里不能下。',
      )
      return
    }
    historyRef.current.push(snap) // 记录人落子前的局面,供悔棋
    const next = applyMove(snap, x, y, HUMAN)
    if (!next) return
    setSnap(next)
    setNote('白棋(电脑)思考中…')
    setTurn(BOT)
  }

  // 人停一手
  function handleHumanPass() {
    if (phase !== 'play' || turn !== HUMAN || thinking) return
    const passes = snap.passes + 1
    if (passes >= 2) {
      endGame(snap.board, '双方停一手,终局数子。')
      return
    }
    setSnap({ ...snap, passes, lastMove: null })
    setNote('你停了一手。白棋行棋 —— 它若也停,本局即终局。')
    setTurn(BOT)
  }

  function handleResign() {
    if (phase !== 'play') return
    setResult(scoreArea(snap.board, { komi: KOMI }))
    setPhase('over')
    setNote('你认输了。再来一盘吧 —— 多练几次就有感觉了!')
    sound.play('wrong')
  }

  function handleUndo() {
    if (phase !== 'play' || turn !== HUMAN || thinking) return
    const prev = historyRef.current.pop()
    if (!prev) return
    setSnap(prev)
    setTurn(HUMAN)
    setNote('已悔棋,回到你上一手之前。')
  }

  function newGame() {
    historyRef.current = []
    setSnap(freshSnapshot())
    setTurn(HUMAN)
    setPhase('play')
    setResult(null)
    setThinking(false)
    setNote('新对局开始 —— 你执黑先行。')
  }

  // 机器人回合:轮到白棋时思考一手
  useEffect(() => {
    if (phase !== 'play' || turn !== BOT) return
    setThinking(true)
    const timer = setTimeout(() => {
      const mv = chooseBotMove(snap.board, BOT, snap.ko)
      if (mv === null) {
        // 机器人停一手
        const passes = snap.passes + 1
        if (passes >= 2) {
          endGame(snap.board, '双方停一手,终局数子。')
        } else {
          setSnap({ ...snap, passes, lastMove: null })
          setNote('白棋也停了一手。轮到你 —— 你若再停,本局终局数子。')
          setTurn(HUMAN)
        }
        setThinking(false)
        return
      }
      const next = applyMove(snap, mv.x, mv.y, BOT)
      setThinking(false)
      if (!next) {
        // 理论上不会发生(chooseBotMove 只返回合法点);兜底交还人类
        setTurn(HUMAN)
        return
      }
      setSnap(next)
      setNote('轮到你了。')
      setTurn(HUMAN)
    }, 450)
    return () => clearTimeout(timer)
    // 仅在轮到机器人 / 局面推进时触发
  }, [turn, phase, snap, applyMove, endGame])

  const territory = useMemo(() => result?.ownership ?? null, [result])
  const canUndo = phase === 'play' && turn === HUMAN && !thinking && historyRef.current.length > 0

  return (
    <div className="pv">
      <div className="pv__bar">
        <button type="button" className="pv__back" onClick={onExit}>
          ← 返回
        </button>
        <span className="pv__title">自由对弈 · 9 路 · 你执黑</span>
      </div>

      <div className="pv__status">
        <span className={`pv__turn pv__turn--${turn === HUMAN ? 'b' : 'w'}`}>
          <Taiji size={22} spin={thinking} />
          {phase === 'over' ? '本局结束' : turn === HUMAN ? '轮到你 · 黑' : '电脑思考 · 白'}
        </span>
        <span className="pv__caps">
          你提 {snap.capturedByHuman} · 机提 {snap.capturedByBot}
        </span>
      </div>

      <Goban
        board={snap.board}
        toPlay={phase === 'play' && turn === HUMAN ? HUMAN : null}
        koPoint={snap.ko}
        onPlay={handleHumanPlay}
        lastMove={snap.lastMove}
        territory={territory}
        showCoordinates
      />

      <div className={`pv__note${thinking ? ' pv__note--think' : ''}`}>{note}</div>

      {phase === 'play' ? (
        <div className="pv__controls">
          <button type="button" className="btn btn--ghost" onClick={handleUndo} disabled={!canUndo}>
            ↶ 悔棋
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleHumanPass}
            disabled={turn !== HUMAN || thinking}
          >
            停一手 (pass)
          </button>
          <button type="button" className="btn btn--ghost" onClick={handleResign}>
            认输
          </button>
        </div>
      ) : (
        <div className="pv__overcard">
          {result && (
            <div className="pv__score">
              <div className="pv__scorerow">
                <span className="pv__scoreside pv__scoreside--b">黑 {result.black} 子</span>
                <span className="pv__scorevs">对</span>
                <span className="pv__scoreside pv__scoreside--w">白 {result.white} 子</span>
              </div>
              <div className="pv__scoremeta">
                含贴目 {result.komi} · 黑空 {result.blackTerritory} / 白空 {result.whiteTerritory}
                {result.dame > 0 && ` · 单官 ${result.dame}`}
              </div>
              <div className="pv__scoreresult">
                {result.winner === null
                  ? '双方打平'
                  : `${result.winner === 'B' ? '你(黑)' : '电脑(白)'}胜 ${result.margin} 子`}
              </div>
            </div>
          )}
          <div className="pv__overbtns">
            <button type="button" className="btn" onClick={newGame}>
              再来一盘
            </button>
            <button type="button" className="btn btn--ghost" onClick={onExit}>
              返回
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
