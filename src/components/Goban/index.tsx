// 棋盘组件(小程序 Canvas 2D 版)。
// web 版用 SVG 渲染;小程序不支持交互式 SVG,改为单个 Canvas 绘制 + View 覆盖层做二次确认条。
// 动画(呼吸提示圈 / 脉冲 / 落子缩放)用 canvas.requestAnimationFrame 按需驱动,静止时只画一帧。
import { useEffect, useMemo, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { Canvas, View } from '@tarojs/components'
import type { CanvasTouchEvent } from '@tarojs/components'
import type { Board, Point, Stone } from '../../engine/types'
import type { Owner } from '../../engine/score'
import { analyzeMove, getCell, pointKey } from '../../engine/board'
import './index.scss'

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
  /** 是否显示禁入点 / 送叫吃等智能提示(默认开) */
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

// 画布配色(与全局 CSS 设计令牌保持一致;canvas 无法读 CSS 变量,故硬编码)
const C = {
  paper: '#cdba8c',
  line: 'rgba(40, 28, 12, 0.7)',
  star: 'rgba(40, 28, 12, 0.85)',
  coord: '#6b4f2a',
  gold: '#d9b167',
  jade: '#74bd9c',
  cinnabar: '#d3553f',
  ochre: '#c79152',
  stoneB: ['#5a5a5e', '#1a1a1c', '#000000'],
  stoneW: ['#ffffff', '#ece7dc', '#b9b2a3'],
  terrB: 'rgba(20, 20, 20, 0.66)',
  terrW: 'rgba(255, 255, 255, 0.82)',
  terrWEdge: '#9a9a9a',
  dame: '#6b5a3a',
}

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

let uid = 0

interface CanvasView {
  canvas: any
  ctx: any
  /** 画布 CSS 宽度 */
  w: number
  dpr: number
}

interface DrawState {
  board: Board
  toPlay: Stone | null
  markers: Marker[]
  hintPoints: Point[]
  showCoordinates: boolean
  lastMove: Point | null
  territory: Owner[] | null
  pending: Point | null
  analysis: ReturnType<typeof analyzeMove> | null
  capturedKeys: Set<string>
  showSmartHints: boolean
  dropKeys: Set<number>
  dropT0: number
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
  const [pending, setPending] = useState<Point | null>(null)
  const idRef = useRef(`goban-${++uid}`)
  const viewRef = useRef<CanvasView | null>(null)
  const loopingRef = useRef(false)
  const destroyedRef = useRef(false)
  const prevBoardRef = useRef<Board | null>(null)
  const dropRef = useRef<{ keys: Set<number>; t0: number }>({ keys: new Set(), t0: 0 })
  const touchRef = useRef<{ x: number; y: number } | null>(null)

  const px = (i: number) => PAD + i * CELL
  const interactive = !!onPlay && toPlay !== null

  // 局面一变(落子成功 / 对手行棋 / 重来),清掉未确认的虚影,并记录新增棋子做落子动画
  useEffect(() => {
    const prev = prevBoardRef.current
    const keys = new Set<number>()
    if (prev && prev.size === board.size) {
      for (let i = 0; i < board.cells.length; i++) {
        if (board.cells[i] && !prev.cells[i]) keys.add(i)
      }
    }
    if (keys.size > 0) dropRef.current = { keys, t0: Date.now() }
    prevBoardRef.current = board
    setPending(null)
  }, [board])

  // 待确认点的落子分析
  const analysis = useMemo(() => {
    if (!pending || toPlay === null) return null
    if (getCell(board, pending.x, pending.y) !== null) return null
    return analyzeMove(board, pending.x, pending.y, toPlay, koPoint)
  }, [pending, toPlay, board, koPoint])

  // 这一手会提走的对方子(用于红色脉冲高亮)
  const capturedKeys = useMemo(() => {
    const s = new Set<string>()
    if (showSmartHints && analysis?.legal) {
      for (const p of analysis.captured) s.add(pointKey(p))
    }
    return s
  }, [analysis, showSmartHints])

  // 最新状态放进 ref,绘制循环里读取,避免重建闭包
  const stateRef = useRef<DrawState>(null as unknown as DrawState)
  stateRef.current = {
    board,
    toPlay,
    markers,
    hintPoints,
    showCoordinates,
    lastMove,
    territory,
    pending,
    analysis,
    capturedKeys,
    showSmartHints,
    dropKeys: dropRef.current.keys,
    dropT0: dropRef.current.t0,
  }

  // ===== 画布初始化 =====
  useEffect(() => {
    destroyedRef.current = false
    let tries = 0
    const init = () => {
      if (destroyedRef.current) return
      Taro.createSelectorQuery()
        .select(`#${idRef.current}`)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (destroyedRef.current) return
          const r = res?.[0]
          if (!r || !r.node || !r.width) {
            if (tries++ < 20) setTimeout(init, 80)
            return
          }
          const canvas = r.node
          const dpr = Taro.getSystemInfoSync().pixelRatio || 2
          canvas.width = Math.floor(r.width * dpr)
          canvas.height = Math.floor(r.height * dpr)
          viewRef.current = { canvas, ctx: canvas.getContext('2d'), w: r.width, dpr }
          requestDraw()
        })
    }
    Taro.nextTick(init)
    return () => {
      destroyedRef.current = true
      loopingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 任何会影响画面的状态变化都触发重绘(必要时启动动画循环)
  useEffect(() => {
    requestDraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, pending, hintPoints, markers, lastMove, territory, toPlay, showCoordinates])

  function needsAnimation(): boolean {
    const s = stateRef.current
    const dropping = s.dropKeys.size > 0 && Date.now() - s.dropT0 < 200
    return !!s.pending || s.hintPoints.length > 0 || s.capturedKeys.size > 0 || dropping
  }

  function requestDraw() {
    const v = viewRef.current
    if (!v) return
    drawFrame()
    if (needsAnimation() && !loopingRef.current) {
      loopingRef.current = true
      const tick = () => {
        if (destroyedRef.current || !viewRef.current) {
          loopingRef.current = false
          return
        }
        if (!needsAnimation()) {
          loopingRef.current = false
          drawFrame() // 收尾再画一帧静态画面
          return
        }
        drawFrame()
        raf(tick)
      }
      raf(tick)
    }
  }

  function raf(fn: () => void) {
    const v = viewRef.current
    if (v?.canvas?.requestAnimationFrame) v.canvas.requestAnimationFrame(fn)
    else setTimeout(fn, 17)
  }

  // ===== 绘制 =====
  function drawFrame() {
    const v = viewRef.current
    if (!v || !v.ctx) return
    const { ctx } = v
    const s = stateRef.current
    const bsize = s.board.size
    const bdim = PAD * 2 + (bsize - 1) * CELL
    const scale = (v.w * v.dpr) / bdim
    const now = Date.now()

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, v.canvas.width, v.canvas.height)
    ctx.setTransform(scale, 0, 0, scale, 0, 0)

    // 棋盘底(圆角宣纸)
    roundRect(ctx, 0, 0, bdim, bdim, 8)
    ctx.fillStyle = C.paper
    ctx.fill()

    // 网格线
    ctx.strokeStyle = C.line
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i < bsize; i++) {
      ctx.moveTo(px(0), px(i))
      ctx.lineTo(px(bsize - 1), px(i))
      ctx.moveTo(px(i), px(0))
      ctx.lineTo(px(i), px(bsize - 1))
    }
    ctx.stroke()

    // 星位
    ctx.fillStyle = C.star
    for (const p of starPoints(bsize)) {
      circle(ctx, px(p.x), px(p.y), CELL * 0.1)
      ctx.fill()
    }

    // 坐标
    if (s.showCoordinates) {
      ctx.fillStyle = C.coord
      ctx.font = '600 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let i = 0; i < bsize; i++) {
        ctx.fillText(COLS[i], px(i), PAD - 14)
        ctx.fillText(String(bsize - i), PAD - 16, px(i))
      }
    }

    // 终局数子着色
    if (s.territory) {
      for (let k = 0; k < bsize * bsize; k++) {
        const x = k % bsize
        const y = Math.floor(k / bsize)
        if (getCell(s.board, x, y) !== null) continue
        const owner = s.territory[k]
        if (owner === 'B' || owner === 'W') {
          ctx.fillStyle = owner === 'B' ? C.terrB : C.terrW
          roundRect(ctx, px(x) - CELL * 0.16, px(y) - CELL * 0.16, CELL * 0.32, CELL * 0.32, 2)
          ctx.fill()
          if (owner === 'W') {
            ctx.strokeStyle = C.terrWEdge
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        } else if (owner === 'dame') {
          ctx.fillStyle = C.dame
          circle(ctx, px(x), px(y), CELL * 0.08)
          ctx.fill()
        }
      }
    }

    // 棋子
    const dropActive = s.dropKeys.size > 0 && now - s.dropT0 < 200
    for (let y = 0; y < bsize; y++) {
      for (let x = 0; x < bsize; x++) {
        const c = getCell(s.board, x, y)
        if (!c) continue
        let r = CELL * 0.46
        let alpha = 1
        if (dropActive && s.dropKeys.has(y * bsize + x)) {
          const p = Math.min(1, (now - s.dropT0) / 180)
          const ease = 1 - Math.pow(1 - p, 2)
          r *= 0.6 + 0.4 * ease
          alpha = p
        }
        drawStone(ctx, px(x), px(y), r, c, alpha)
        // 这一手会被提走的子:朱砂脉冲圈
        if (s.capturedKeys.has(pointKey({ x, y }))) {
          const pulse = 0.3 + 0.6 * wave(now, 900)
          ctx.globalAlpha = pulse
          ctx.strokeStyle = C.cinnabar
          ctx.lineWidth = 2.6
          circle(ctx, px(x), px(y), CELL * 0.46)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }
    }

    // 最后一手标记
    if (s.lastMove) {
      const c = getCell(s.board, s.lastMove.x, s.lastMove.y)
      if (c) {
        ctx.fillStyle = c === 'B' ? '#ffffff' : '#000000'
        circle(ctx, px(s.lastMove.x), px(s.lastMove.y), CELL * 0.14)
        ctx.fill()
      }
    }

    // 教学推荐点:碧玉呼吸圈 + 光晕
    for (const p of s.hintPoints) {
      const t = wave(now, 1300)
      const haloScale = 0.8 + 0.55 * t
      const haloAlpha = 0.25 + 0.25 * t
      ctx.globalAlpha = haloAlpha
      ctx.fillStyle = C.jade
      circle(ctx, px(p.x), px(p.y), CELL * 0.46 * haloScale)
      ctx.fill()
      const ringScale = 0.92 + 0.26 * t
      ctx.globalAlpha = 0.85 + 0.15 * t
      ctx.strokeStyle = C.jade
      ctx.lineWidth = 4.5
      circle(ctx, px(p.x), px(p.y), CELL * 0.42 * ringScale)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // 教学标注
    for (const m of s.markers) {
      const cx = px(m.x)
      const cy = px(m.y)
      const col = m.color ?? C.cinnabar
      ctx.strokeStyle = col
      ctx.lineWidth = 2.5
      if (m.kind === 'circle') {
        circle(ctx, cx, cy, CELL * 0.3)
        ctx.stroke()
      } else if (m.kind === 'square') {
        ctx.strokeRect(cx - CELL * 0.28, cy - CELL * 0.28, CELL * 0.56, CELL * 0.56)
      } else if (m.kind === 'cross') {
        ctx.lineWidth = 2.6
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(cx - CELL * 0.24, cy - CELL * 0.24)
        ctx.lineTo(cx + CELL * 0.24, cy + CELL * 0.24)
        ctx.moveTo(cx - CELL * 0.24, cy + CELL * 0.24)
        ctx.lineTo(cx + CELL * 0.24, cy - CELL * 0.24)
        ctx.stroke()
      } else if (m.kind === 'triangle') {
        const r = CELL * 0.3
        ctx.beginPath()
        ctx.moveTo(cx, cy - r)
        ctx.lineTo(cx - r * 0.87, cy + r * 0.5)
        ctx.lineTo(cx + r * 0.87, cy + r * 0.5)
        ctx.closePath()
        ctx.stroke()
      } else {
        const onStone = getCell(s.board, m.x, m.y)
        ctx.fillStyle = onStone === 'B' ? '#ffffff' : onStone === 'W' ? '#000000' : col
        ctx.font = '700 16px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(m.label ?? '', cx, cy)
      }
    }

    // 待确认虚影:十字定位线 + 半透明棋子 / 禁入提示
    if (s.pending) {
      ctx.strokeStyle = C.gold
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.5
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(px(0), px(s.pending.y))
      ctx.lineTo(px(bsize - 1), px(s.pending.y))
      ctx.moveTo(px(s.pending.x), px(0))
      ctx.lineTo(px(s.pending.x), px(bsize - 1))
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    }

    if (s.showSmartHints && s.pending && s.analysis && s.toPlay) {
      const hx = px(s.pending.x)
      const hy = px(s.pending.y)
      const a = s.analysis
      if (a.legal) {
        drawStone(ctx, hx, hy, CELL * 0.46, s.toPlay, 0.62)
        // 已点选虚影的金圈(脉冲)
        ctx.globalAlpha = 0.55 + 0.45 * wave(now, 1100)
        ctx.strokeStyle = C.gold
        ctx.lineWidth = 2.2
        circle(ctx, hx, hy, CELL * 0.54)
        ctx.stroke()
        ctx.globalAlpha = 1
        // 送叫吃 / 自填一气:土黄虚线警示圈
        if (a.selfLiberties === 1 && a.captured.length === 0) {
          ctx.globalAlpha = 0.4 + 0.6 * wave(now, 1000)
          ctx.strokeStyle = C.ochre
          ctx.lineWidth = 2.6
          ctx.setLineDash([3, 3])
          circle(ctx, hx, hy, CELL * 0.58)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.globalAlpha = 1
        }
      } else if (a.error === 'suicide' || a.error === 'ko') {
        ctx.strokeStyle = C.cinnabar
        ctx.lineWidth = 2.6
        ctx.lineCap = 'round'
        circle(ctx, hx, hy, CELL * 0.34)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(hx - CELL * 0.24, hy - CELL * 0.24)
        ctx.lineTo(hx + CELL * 0.24, hy + CELL * 0.24)
        ctx.stroke()
      }
    }
  }

  function drawStone(ctx: any, cx: number, cy: number, r: number, c: Stone, alpha: number) {
    ctx.globalAlpha = alpha
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
    ctx.shadowOffsetX = 0.5
    ctx.shadowOffsetY = 1.5
    ctx.shadowBlur = 1.5
    const grad = ctx.createRadialGradient(
      cx - r * 0.3, cy - r * 0.44, r * 0.1,
      cx, cy, r * (c === 'B' ? 1.56 : 1.64),
    )
    const cols = c === 'B' ? C.stoneB : C.stoneW
    grad.addColorStop(0, cols[0])
    grad.addColorStop(c === 'B' ? 0.45 : 0.68, cols[1])
    grad.addColorStop(1, cols[2])
    ctx.fillStyle = grad
    circle(ctx, cx, cy, r)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    ctx.strokeStyle = c === 'W' ? '#9a9a9a' : '#000000'
    ctx.lineWidth = c === 'W' ? 0.8 : 0.4
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // ===== 触摸 =====
  function eventPos(e: CanvasTouchEvent, changed: boolean): { x: number; y: number } | null {
    const t = (changed ? e.changedTouches : e.touches)?.[0] as any
    if (!t) return null
    // 小程序原生 canvas 触摸事件给画布相对坐标 x/y
    if (typeof t.x === 'number') return { x: t.x, y: t.y }
    return null
  }

  function handleTouchStart(e: CanvasTouchEvent) {
    touchRef.current = eventPos(e, false)
  }

  function handleTouchEnd(e: CanvasTouchEvent) {
    if (!interactive) return
    const v = viewRef.current
    const start = touchRef.current
    touchRef.current = null
    const pos = eventPos(e, true)
    if (!v || !pos) return
    // 移动超过阈值视为滑动手势,不算点击
    if (start && Math.hypot(pos.x - start.x, pos.y - start.y) > 12) return
    const scale = dim / v.w
    const bx = pos.x * scale
    const by = pos.y * scale
    const ix = Math.round((bx - PAD) / CELL)
    const iy = Math.round((by - PAD) / CELL)
    if (ix < 0 || iy < 0 || ix >= size || iy >= size) return
    if (Math.abs(bx - px(ix)) > CELL / 2 || Math.abs(by - px(iy)) > CELL / 2) return
    tapPoint(ix, iy)
  }

  function tapPoint(x: number, y: number) {
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
    setPending({ x, y })
  }

  function commit(x: number, y: number) {
    const a = analyzeMove(board, x, y, toPlay!, koPoint)
    if (!a.legal) return
    try {
      Taro.vibrateShort({ type: 'light' })
    } catch {
      /* 部分平台不支持震动 */
    }
    onPlay?.(x, y)
    setPending(null)
  }

  // 确认条色调:非法=禁、落子后仅 1 口气=当心、其余=正常
  let confirmTone: 'ok' | 'warn' | 'bad' = 'ok'
  if (pending && analysis) {
    if (!analysis.legal) confirmTone = 'bad'
    else if (analysis.captured.length === 0 && analysis.selfLiberties === 1)
      confirmTone = 'warn'
  }

  return (
    <View className='goban'>
      <View className='goban__square'>
        <Canvas
          type='2d'
          id={idRef.current}
          canvasId={idRef.current}
          className='goban__canvas'
          disableScroll={interactive}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />
      </View>

      {/* 二次确认弹框:浮在所点棋子的正上方(靠近顶行时翻到下方) */}
      {pending && (
        <View
          className={`confirmbar confirmbar--${confirmTone}${
            pending.y <= 1 ? ' confirmbar--below' : ''
          }`}
          style={{
            left: `${(px(pending.x) / dim) * 100}%`,
            top: `${(px(pending.y) / dim) * 100}%`,
          }}
        >
          <View
            className='confirmbar__btn confirmbar__btn--cancel'
            onClick={() => setPending(null)}
          >
            ✕
          </View>
          <View
            className={`confirmbar__btn confirmbar__btn--ok${
              analysis?.legal ? '' : ' confirmbar__btn--disabled'
            }`}
            onClick={() => analysis?.legal && commit(pending.x, pending.y)}
          >
            ✓
          </View>
        </View>
      )}
    </View>
  )
}

function circle(ctx: any, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
}

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** 0→1→0 的正弦呼吸波,period 毫秒一个周期 */
function wave(now: number, period: number): number {
  return 0.5 - 0.5 * Math.cos(((now % period) / period) * Math.PI * 2)
}
