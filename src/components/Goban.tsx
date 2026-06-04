import { useEffect, useMemo, useState } from 'react'
import type { Board, Point, Stone } from '../engine/types'
import type { Owner } from '../engine/score'
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
  /** 落子(已二次确认)的回调;合法性由上层判断,便于做失败提示音 */
  onPlay?: (x: number, y: number) => void
  /** 二次确认:先放虚影,再点「✓ 落子」才真正落子。默认开启(移动端防误触) */
  confirmMode?: boolean
  markers?: Marker[]
  /** 教学推荐落子点,显示绿色呼吸圈 */
  hintPoints?: Point[]
  /** 是否显示悬停预览 / 禁入点 / 送叫吃等智能提示(默认开) */
  showSmartHints?: boolean
  showCoordinates?: boolean
  lastMove?: Point | null
  /**
   * 终局数子着色:长度 = size*size 的归属数组(行优先)。
   * 仅在空交叉点上画:黑空=深色块、白空=浅色块、单官=灰点。传入则进入"数子展示"。
   */
  territory?: Owner[] | null
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

function coordName(size: number, p: Point): string {
  return `${COLS[p.x]}${size - p.y}`
}

export function Goban(props: GobanProps) {
  const {
    board,
    toPlay = null,
    koPoint = null,
    onPlay,
    confirmMode = true,
    markers = [],
    hintPoints = [],
    showSmartHints = true,
    showCoordinates = false,
    lastMove = null,
    territory = null,
  } = props

  const size = board.size
  const dim = PAD * 2 + (size - 1) * CELL
  const [hover, setHover] = useState<Point | null>(null)
  const [pending, setPending] = useState<Point | null>(null)

  const px = (i: number) => PAD + i * CELL
  const interactive = !!onPlay && toPlay !== null

  // 局面一变(落子成功 / 对手行棋 / 重来),清掉未确认的虚影
  useEffect(() => {
    setPending(null)
  }, [board])

  // 当前预览点:已点选的虚影优先,否则鼠标悬停(桌面端)
  const preview = pending ?? hover

  // 预览点的落子分析
  const analysis = useMemo(() => {
    if (!preview || toPlay === null) return null
    if (getCell(board, preview.x, preview.y) !== null) return null
    return analyzeMove(board, preview.x, preview.y, toPlay, koPoint)
  }, [preview, toPlay, board, koPoint])

  // 这一手会提走的对方子(用于红色脉冲高亮)
  const capturedKeys = useMemo(() => {
    const s = new Set<string>()
    if (showSmartHints && analysis?.legal) {
      for (const p of analysis.captured) s.add(pointKey(p))
    }
    return s
  }, [analysis, showSmartHints])

  const stars = useMemo(() => starPoints(size), [size])

  function tapPoint(x: number, y: number) {
    if (!interactive) return
    if (getCell(board, x, y) !== null) return // 已有子:忽略
    if (!confirmMode) {
      onPlay?.(x, y)
      return
    }
    // 再次点中同一个待确认点 = 直接落子
    if (pending && pending.x === x && pending.y === y) {
      commit(x, y)
      return
    }
    setHover(null)
    setPending({ x, y })
  }

  function commit(x: number, y: number) {
    const a = analyzeMove(board, x, y, toPlay!, koPoint)
    if (!a.legal) return
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(14)
    onPlay?.(x, y)
    setPending(null)
  }

  const stones: Array<{ x: number; y: number; c: Stone }> = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = getCell(board, x, y)
      if (c) stones.push({ x, y, c })
    }
  }

  // 确认条文案
  let confirmHint = ''
  let confirmTone: 'ok' | 'warn' | 'bad' = 'ok'
  if (pending && analysis) {
    if (!analysis.legal) {
      confirmTone = 'bad'
      confirmHint =
        analysis.error === 'ko'
          ? '打劫 · 此手不可立即提回'
          : analysis.error === 'suicide'
            ? '禁入点 · 落子后己方无气'
            : '此处不可落子'
    } else if (analysis.captured.length > 0) {
      confirmHint = `提 ${analysis.captured.length} 子`
    } else if (analysis.selfLiberties === 1) {
      confirmTone = 'warn'
      confirmHint = '当心 · 落子后仅 1 口气'
    } else {
      confirmHint = `${analysis.selfLiberties} 口气`
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
          <radialGradient id="stoneB" cx="35%" cy="28%" r="78%">
            <stop offset="0%" stopColor="var(--stone-b-1)" />
            <stop offset="45%" stopColor="var(--stone-b-2)" />
            <stop offset="100%" stopColor="var(--stone-b-3)" />
          </radialGradient>
          <radialGradient id="stoneW" cx="35%" cy="28%" r="82%">
            <stop offset="0%" stopColor="var(--stone-w-1)" />
            <stop offset="68%" stopColor="var(--stone-w-2)" />
            <stop offset="100%" stopColor="var(--stone-w-3)" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width={dim} height={dim} rx="8" className="goban__bg" />

        {Array.from({ length: size }, (_, i) => (
          <g key={`line-${i}`}>
            <line x1={px(0)} y1={px(i)} x2={px(size - 1)} y2={px(i)} className="goban__line" />
            <line x1={px(i)} y1={px(0)} x2={px(i)} y2={px(size - 1)} className="goban__line" />
          </g>
        ))}

        {stars.map((p) => (
          <circle key={`star-${p.x}-${p.y}`} cx={px(p.x)} cy={px(p.y)} r={CELL * 0.1} className="goban__star" />
        ))}

        {showCoordinates &&
          Array.from({ length: size }, (_, i) => (
            <g key={`coord-${i}`} className="goban__coord">
              <text x={px(i)} y={PAD - 12} textAnchor="middle">{COLS[i]}</text>
              <text x={PAD - 14} y={px(i)} textAnchor="middle" dominantBaseline="central">{size - i}</text>
            </g>
          ))}

        {territory &&
          Array.from({ length: size * size }, (_, k) => {
            const x = k % size
            const y = Math.floor(k / size)
            if (getCell(board, x, y) !== null) return null
            const owner = territory[k]
            if (owner === 'B' || owner === 'W') {
              return (
                <rect
                  key={`terr-${k}`}
                  x={px(x) - CELL * 0.16}
                  y={px(y) - CELL * 0.16}
                  width={CELL * 0.32}
                  height={CELL * 0.32}
                  className={`territory territory--${owner === 'B' ? 'b' : 'w'}`}
                />
              )
            }
            if (owner === 'dame') {
              return <circle key={`terr-${k}`} cx={px(x)} cy={px(y)} r={CELL * 0.08} className="territory--dame" />
            }
            return null
          })}

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
                  stroke="var(--cinnabar)"
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
            stroke="var(--jade)"
            strokeWidth={3}
          />
        ))}

        {markers.map((m, i) => {
          const cx = px(m.x)
          const cy = px(m.y)
          const col = m.color ?? 'var(--cinnabar)'
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

        {/* 待确认的虚影:十字定位线 + 半透明棋子 + 后果提示 */}
        {pending && (
          <line
            x1={px(0)} y1={px(pending.y)} x2={px(size - 1)} y2={px(pending.y)}
            className="goban__aim"
          />
        )}
        {pending && (
          <line
            x1={px(pending.x)} y1={px(0)} x2={px(pending.x)} y2={px(size - 1)}
            className="goban__aim"
          />
        )}

        {showSmartHints && preview && analysis && (
          <HoverHint
            x={px(preview.x)}
            y={px(preview.y)}
            legal={analysis.legal}
            error={analysis.error}
            selfLiberties={analysis.selfLiberties}
            captures={analysis.captured.length}
            color={toPlay}
            firm={!!pending}
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
                onMouseEnter={() => !pending && setHover({ x, y })}
                onClick={() => tapPoint(x, y)}
              />
            )
          })}
      </svg>

      {/* 二次确认条:仅在已点选虚影时出现 */}
      {pending && (
        <div className={`confirmbar confirmbar--${confirmTone}`}>
          <div className="confirmbar__info">
            <span className="confirmbar__coord">{coordName(size, pending)}</span>
            <span className="confirmbar__hint">{confirmHint}</span>
          </div>
          <div className="confirmbar__btns">
            <button
              type="button"
              className="confirmbar__btn confirmbar__btn--cancel"
              onClick={() => setPending(null)}
            >
              ✕ 取消
            </button>
            <button
              type="button"
              className="confirmbar__btn confirmbar__btn--ok"
              disabled={!analysis?.legal}
              onClick={() => commit(pending.x, pending.y)}
            >
              ✓ 落子
            </button>
          </div>
        </div>
      )}
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
  /** 已点选(虚影更实);仅悬停时更淡 */
  firm: boolean
}

function HoverHint(props: HoverHintProps) {
  const { x, y, legal, error, selfLiberties, captures, color, firm } = props
  if (legal) {
    return (
      <g pointerEvents="none">
        <circle
          cx={x}
          cy={y}
          r={CELL * 0.46}
          fill={color === 'B' ? 'url(#stoneB)' : 'url(#stoneW)'}
          className={`stone stone--preview${firm ? ' stone--firm' : ''}`}
        />
        {firm && (
          <circle cx={x} cy={y} r={CELL * 0.54} className="aim-ring" fill="none" stroke="var(--gold)" strokeWidth={2.2} />
        )}
        {selfLiberties === 1 && captures === 0 && (
          <circle cx={x} cy={y} r={CELL * 0.58} className="danger-ring" fill="none" stroke="var(--ochre)" strokeWidth={2.6} strokeDasharray="3 3" />
        )}
      </g>
    )
  }
  if (error === 'suicide' || error === 'ko') {
    return (
      <g pointerEvents="none" className="forbidden">
        <circle cx={x} cy={y} r={CELL * 0.34} fill="none" stroke="var(--cinnabar)" strokeWidth={2.6} />
        <line x1={x - CELL * 0.24} y1={y - CELL * 0.24} x2={x + CELL * 0.24} y2={y + CELL * 0.24} stroke="var(--cinnabar)" strokeWidth={2.6} strokeLinecap="round" />
      </g>
    )
  }
  return null
}
