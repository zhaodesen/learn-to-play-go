// 自由对弈页:9 路,人执黑 vs 内置机器人。对应 web 版 PlayView。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { Goban } from '../../components/Goban'
import { Taiji } from '../../components/Taiji'
import { analyzeMove, createBoard, placeStone } from '../../engine/board'
import { chooseBotMove } from '../../engine/bot'
import { scoreArea } from '../../engine/score'
import { sound } from '../../audio/sound'
import { loadProgress } from '../../storage/progress'
import type { Board, Point, Stone } from '../../engine/types'
import type { ScoreResult } from '../../engine/score'
import './index.scss'

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

export default function PlayPage() {
  const [snap, setSnap] = useState<Snapshot>(() => freshSnapshot())
  const [turn, setTurn] = useState<Stone>(HUMAN)
  const [phase, setPhase] = useState<Phase>('play')
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [thinking, setThinking] = useState(false)
  const [note, setNote] = useState<string>('你执黑先行 —— 点击棋盘落子。')
  // 悔棋:保存「轮到人落子」时刻的快照
  const historyRef = useRef<Snapshot[]>([])

  useDidShow(() => {
    const s = loadProgress().settings
    sound.configure({ sfx: s.sfx, volume: s.volume })
  })

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
  const canUndo =
    phase === 'play' && turn === HUMAN && !thinking && historyRef.current.length > 0

  return (
    <View className='pv'>
      <View className='pv__bar'>
        <View className='pv__back' onClick={() => Taro.navigateBack()}>
          ← 返回
        </View>
        <Text className='pv__title'>自由对弈 · 9 路 · 你执黑</Text>
      </View>

      <View className='pv__status'>
        <View className={`pv__turn pv__turn--${turn === HUMAN ? 'b' : 'w'}`}>
          <Taiji size={22} spin={thinking} />
          <Text>
            {phase === 'over' ? '本局结束' : turn === HUMAN ? '轮到你 · 黑' : '电脑思考 · 白'}
          </Text>
        </View>
        <Text className='pv__caps'>
          你提 {snap.capturedByHuman} · 机提 {snap.capturedByBot}
        </Text>
      </View>

      <Goban
        board={snap.board}
        toPlay={phase === 'play' && turn === HUMAN ? HUMAN : null}
        koPoint={snap.ko}
        onPlay={handleHumanPlay}
        lastMove={snap.lastMove}
        territory={territory}
        showCoordinates
      />

      <View className={`pv__note${thinking ? ' pv__note--think' : ''}`}>{note}</View>

      {phase === 'play' ? (
        <View className='pv__controls'>
          <View
            className={`btn btn--ghost${canUndo ? '' : ' btn--disabled'}`}
            onClick={() => canUndo && handleUndo()}
          >
            ↶ 悔棋
          </View>
          <View
            className={`btn btn--ghost${
              turn === HUMAN && !thinking ? '' : ' btn--disabled'
            }`}
            onClick={handleHumanPass}
          >
            停一手
          </View>
          <View className='btn btn--ghost' onClick={handleResign}>
            认输
          </View>
        </View>
      ) : (
        <View className='pv__overcard'>
          {result && (
            <View className='scorebox'>
              <View className='scorebox__row'>
                <Text className='scorebox__side--b'>黑 {result.black} 子</Text>
                <Text className='scorebox__vs'>对</Text>
                <Text className='scorebox__side--w'>白 {result.white} 子</Text>
              </View>
              <View className='scorebox__meta'>
                含贴目 {result.komi} · 黑空 {result.blackTerritory} / 白空{' '}
                {result.whiteTerritory}
                {result.dame > 0 ? ` · 单官 ${result.dame}` : ''}
              </View>
              <View className='scorebox__result'>
                {result.winner === null
                  ? '双方打平'
                  : `${result.winner === 'B' ? '你(黑)' : '电脑(白)'}胜 ${result.margin} 子`}
              </View>
            </View>
          )}
          <View className='pv__overbtns'>
            <View className='btn' onClick={newGame}>
              再来一盘
            </View>
            <View className='btn btn--ghost' onClick={() => Taro.navigateBack()}>
              返回
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
