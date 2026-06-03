import { useMemo, useState } from 'react'
import type { Board, Point, Stone } from '../engine/types'
import { analyzeMove, getCell, pointKey } from '../engine/board'
import './Goban.css'

export type MarkerKind = 'circle' | 'triangle' | 'square' | 'cross' | 'label'

/** 棋盘上的标注,供关卡教学使用(圈出某点、标 A/B、画三角等) */
export interface Marker {
  x: number
  y: number
  kind: MarkerKind
  label?: string
  color?: string
}

export interface GobanProps {
  board: Board
  /** 轮到谁下;为 null 表示只读棋盘(不可落子、不显示预览) */
  toPlay?: Stone | null
  koPoint?: Point | null
  /** 点击盘内任意点的回调(合法性由上层判断,便于做失败提示音) */
  onPlay?: (x: number, y: number) => void
  markers?: Marker[]
  /** 教学推荐落子点,显示绿色呼吸圈 */
  hintPoints?: Point[]
  /** 是否显示悬停预览 / 禁入点 / 送叫吃等智能提示(默认开) */
  showSmartHints?: boolean
  showCoordinates?: boolean
  lastMove?: Point | null
}

const CELL = 30
const PAD = 30
const COLS = 'ABCDEFGHJKLMNOPQRST' // 跳过 I,沿用围棋坐标习惯

function starPoints(size: number): Point[] {
  if (size === 9) {
    return [
      { x: 2, y: 2 }, { x: 6, y: 2 }, { x: 4, y: 4 },
      { x: 2, y: 6 }, { x: 6, y: 6 },
    ]
  }
  if (size === 13) {
    return [
      { x: 3, y: 3 }, { x: 9, y: 3 }, { x: 6, y: 6 },
      { x: 3, y: 9 }, { x: 9, y: 9 },
    ]
  }
  if (size === 19) {
    const v = [3, 9, 15]
    const pts: Point[] = []
    for (const y of v) for (const x of v) pts.push({ x, y })
    return pts
  }
  return []
}

export function Goban(props: GobanProps) {
  const {
    board,
    toPlay = null,
    koPoint = null,
    onPlay,
    markers = [],
    hintPoints = [],
    showSmartHints = true,
    showCoordinates = false,
    lastMove = null,
  } = props

  const size = board.size
  const dim = PAD * 2 + (size - 1) * CELL
  const [hover, setHover] = useState<Point | null>(null)

  const px = (i: number) => PAD + i * CELL
  const interactive = !!onPlay && toPlay !== null

  // 悬停点的落子分析(只读点 / 非交互时为 null)
  const analysis = useMemo(() => {
    if (!hover || toPlay === null) return null
    if (getCell(board, hover.x, hover.y) !== null) return null
    return analyzeMove(board, hover.x, hover.y, toPlay, koPoint)
  }, [hover, toPlay, board, koPoint])

  // 这一手会提走的对方子(用于红色脉冲高亮)
  const capturedKeys = useMemo(() => {
    const s = new Set<string>()
    if (showSmartHints && analysis?.legal) {
      for (const p of analysis.captured) s.add(pointKey(p))
    }
    return s
  }, [analysis, showSmartHints])

  const stars = useMemo(() => starPoints(size), [size])

  const stones: Array<{ x: number; y: number; c: Stone }> = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = getCell(board, x, y)
      if (c) stones.push({ x, y, c })
    }
  }

  return (
    <div className="goban">
      <svg
        viewBox={`0 0 ${dim} ${dim}`}
        role="img"
        aria-label="围棋棋盘"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <radialGradient id="stoneB" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#6e6e6e" />
            <stop offset="45%" stopColor="#1c1c1c" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
          <radialGradient id="stoneW" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#ededed" />
            <stop offset="100%" stopColor="#bcbcbc" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width={dim} height={dim} rx="6" className="goban__bg" />

        {Array.from({ length: size }, (_, i) => (
          <g key={`line-${i}`}>
            <line x1={px(0)} y1={px(i)} x2={px(size - 1)} y2={px(i)} className="goban__line" />
            <line x1={px(i)} y1={px(0)} x2={px(i)} y2={px(size - 1)} className="goban__line" />
          </g>
        ))}

        {stars.map((p) => (
          <circle key={`star-${p.x}-${p.y}`} cx={px(p.x)} cy={px(p.y)} r={CELL * 0.09} className="goban__star" />
        ))}

        {showCoordinates &&
          Array.from({ length: size }, (_, i) => (
            <g key={`coord-${i}`} className="goban__coord">
              <text x={px(i)} y={PAD - 12} textAnchor="middle">{COLS[i]}</text>
              <text x={PAD - 14} y={px(i)} textAnchor="middle" dominantBaseline="central">{size - i}</text>
            </g>
          ))}

        {stones.map(({ x, y, c }) => {
          const willCapture = capturedKeys.has(pointKey({ x, y }))
          return (
            <g key={`s-${x}-${y}`}>
              <circle
                cx={px(x)}
                cy={px(y)}
                r={CELL * 0.46}
                fill={c === 'B' ? 'url(#stoneB)' : 'url(#stoneW)'}
                stroke={c === 'W' ? '#9a9a9a' : '#000000'}
                strokeWidth={c === 'W' ? 0.8 : 0.4}
                className="stone"
              />
              {willCapture && (
                <circle
                  cx={px(x)}
                  cy={px(y)}
                  r={CELL * 0.46}
                  className="capture-ring"
                  fill="none"
                  stroke="#e23b3b"
                  strokeWidth={2.6}
                />
              )}
            </g>
          )
        })}

        {lastMove && getCell(board, lastMove.x, lastMove.y) && (
          <circle
            cx={px(lastMove.x)}
            cy={px(lastMove.y)}
            r={CELL * 0.14}
            className="goban__lastmove"
            fill={getCell(board, lastMove.x, lastMove.y) === 'B' ? '#fff' : '#000'}
          />
        )}

        {hintPoints.map((p) => (
          <circle
            key={`hint-${p.x}-${p.y}`}
            cx={px(p.x)}
            cy={px(p.y)}
            r={CELL * 0.4}
            className="hint-ring"
            fill="none"
            stroke="#3fb96b"
            strokeWidth={3}
          />
        ))}

        {markers.map((m, i) => {
          const cx = px(m.x)
          const cy = px(m.y)
          const col = m.color ?? '#d33'
          if (m.kind === 'circle') {
            return <circle key={`m-${i}`} cx={cx} cy={cy} r={CELL * 0.3} fill="none" stroke={col} strokeWidth={2.5} />
          }
          if (m.kind === 'square') {
            return <rect key={`m-${i}`} x={cx - CELL * 0.28} y={cy - CELL * 0.28} width={CELL * 0.56} height={CELL * 0.56} fill="none" stroke={col} strokeWidth={2.5} />
          }
          if (m.kind === 'cross') {
            return (
              <g key={`m-${i}`} stroke={col} strokeWidth={2.6} strokeLinecap="round">
                <line x1={cx - CELL * 0.24} y1={cy - CELL * 0.24} x2={cx + CELL * 0.24} y2={cy + CELL * 0.24} />
                <line x1={cx - CELL * 0.24} y1={cy + CELL * 0.24} x2={cx + CELL * 0.24} y2={cy - CELL * 0.24} />
              </g>
            )
          }
          if (m.kind === 'triangle') {
            const r = CELL * 0.3
            const pts = `${cx},${cy - r} ${cx - r * 0.87},${cy + r * 0.5} ${cx + r * 0.87},${cy + r * 0.5}`
            return <polygon key={`m-${i}`} points={pts} fill="none" stroke={col} strokeWidth={2.5} />
          }
          const onStone = getCell(board, m.x, m.y)
          return (
            <text
              key={`m-${i}`}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              className="goban__marklabel"
              fill={onStone === 'B' ? '#fff' : onStone === 'W' ? '#000' : col}
            >
              {m.label}
            </text>
          )
        })}

        {showSmartHints && hover && analysis && (
          <HoverHint
            x={px(hover.x)}
            y={px(hover.y)}
            legal={analysis.legal}
            error={analysis.error}
            selfLiberties={analysis.selfLiberties}
            captures={analysis.captured.length}
            color={toPlay}
          />
        )}

        {interactive &&
          Array.from({ length: size * size }, (_, k) => {
            const x = k % size
            const y = Math.floor(k / size)
            return (
              <rect
                key={`hit-${k}`}
                x={px(x) - CELL / 2}
                y={px(y) - CELL / 2}
                width={CELL}
                height={CELL}
                className="goban__hit"
                onMouseEnter={() => setHover({ x, y })}
                onClick={() => onPlay && onPlay(x, y)}
              />
            )
          })}
      </svg>
    </div>
  )
}

interface HoverHintProps {
  x: number
  y: number
  legal: boolean
  error?: string
  selfLiberties: number
  captures: number
  color: Stone | null
}

function HoverHint(props: HoverHintProps) {
  const { x, y, legal, error, selfLiberties, captures, color } = props
  if (legal) {
    return (
      <g pointerEvents="none">
        <circle
          cx={x}
          cy={y}
          r={CELL * 0.46}
          fill={color === 'B' ? 'url(#stoneB)' : 'url(#stoneW)'}
          className="stone stone--preview"
        />
        {selfLiberties === 1 && captures === 0 && (
          <circle cx={x} cy={y} r={CELL * 0.52} className="danger-ring" fill="none" stroke="#f5a623" strokeWidth={2.6} strokeDasharray="3 3" />
        )}
      </g>
    )
  }
  if (error === 'suicide' || error === 'ko') {
    return (
      <g pointerEvents="none" className="forbidden">
        <circle cx={x} cy={y} r={CELL * 0.34} fill="none" stroke="#e23b3b" strokeWidth={2.6} />
        <line x1={x - CELL * 0.24} y1={y - CELL * 0.24} x2={x + CELL * 0.24} y2={y + CELL * 0.24} stroke="#e23b3b" strokeWidth={2.6} strokeLinecap="round" />
      </g>
    )
  }
  return null
}
