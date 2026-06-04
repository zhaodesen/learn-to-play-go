import { useEffect, useMemo, useRef, useState } from 'react'
import { CHAPTERS, LEVELS } from '../levels/data'
import { createBoard } from '../engine/board'
import { toCnNum } from '../utils/cn'
import { Goban } from './Goban'
import type { Board } from '../engine/types'
import type { Level } from '../levels/types'
import type { ProgressData } from '../storage/progress'

interface MapViewProps {
  data: ProgressData
  onOpen: (id: string) => void
}

/** 由关卡初始摆子拼出只读棋盘(供缩略预览) */
function previewBoard(level: Level): Board {
  const cells = createBoard(level.boardSize).cells.slice()
  for (const s of level.stones) cells[s.y * level.boardSize + s.x] = s.c
  return { size: level.boardSize, cells }
}

export function MapView({ data, onOpen }: MapViewProps) {
  const clearedCount = LEVELS.filter((l) => data.levels[l.id]?.cleared).length

  // 每关解锁状态 + 当前应玩关卡(最靠前的「已解锁未通关」)
  const { unlocked, startIndex } = useMemo(() => {
    const unlocked: boolean[] = []
    let start = 0
    let foundStart = false
    LEVELS.forEach((l, i) => {
      const u = i === 0 || !!data.levels[LEVELS[i - 1].id]?.cleared
      unlocked[i] = u
      if (u && !data.levels[l.id]?.cleared && !foundStart) {
        start = i
        foundStart = true
      }
    })
    return { unlocked, startIndex: start }
  }, [data])

  const feedRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(startIndex)
  const activeRef = useRef(startIndex)
  const animating = useRef(false)

  // 受控翻页:页码是唯一真值,滚动由 active 驱动
  // 注意:overflow:hidden 容器上 scrollTo({behavior:'smooth'}) 不生效,
  // 直接写 scrollTop 才有效,故用 rAF 自己做缓动。
  const goTo = (i: number, smooth = true) => {
    const clamped = Math.max(0, Math.min(LEVELS.length - 1, i))
    activeRef.current = clamped
    setActive(clamped)
    const scroller = feedRef.current?.parentElement
    const target = pageRefs.current[clamped]
    if (!scroller || !target) return
    const to = target.offsetTop
    // 不需要动画 / 页面不可见(rAF 被浏览器暂停)时,直接跳位
    if (!smooth || document.hidden) {
      scroller.scrollTop = to
      return
    }
    animating.current = true
    const from = scroller.scrollTop
    const dur = 420
    const t0 = performance.now()
    const ease = (p: number) => 1 - Math.pow(1 - p, 3)
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur)
      scroller.scrollTop = from + (to - from) * ease(p)
      if (p < 1) requestAnimationFrame(tick)
      else animating.current = false
    }
    requestAnimationFrame(tick)
  }
  const step = (dir: number) => {
    if (animating.current) return
    goTo(activeRef.current + dir)
  }

  // 每页高度 = 滚动容器可见高度(百分比高度在 auto 高父级下不可靠,改用实测像素)
  useEffect(() => {
    const feed = feedRef.current
    const scroller = feed?.parentElement
    if (!feed || !scroller) return
    const setH = () => feed.style.setProperty('--page-h', `${scroller.clientHeight}px`)
    setH()
    const ro = new ResizeObserver(setH)
    ro.observe(scroller)
    return () => ro.disconnect()
  }, [])

  // 进入时直接定位到「当前应玩」的关卡(无动画)
  useEffect(() => {
    goTo(startIndex, false)
    // 仅首挂载定位
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 拦截滚轮 / 触摸手势:一次手势只翻一屏
  useEffect(() => {
    const scroller = feedRef.current?.parentElement
    if (!scroller) return

    let wheelLock = false
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (wheelLock || animating.current) return
      if (Math.abs(e.deltaY) < 8) return
      wheelLock = true
      step(e.deltaY > 0 ? 1 : -1)
      window.setTimeout(() => { wheelLock = false }, 520)
    }

    // 跟手拖动:手指移动时实时改 scrollTop,页面同步滑动;松手后按位移吸附到目标页
    let startY = 0
    let startT = 0
    let baseTop = 0
    let dragging = false
    const onTouchStart = (e: TouchEvent) => {
      if (animating.current) return
      dragging = true
      startY = e.touches[0].clientY
      startT = Date.now()
      baseTop = scroller.scrollTop
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging) return
      e.preventDefault()
      const dy = startY - e.touches[0].clientY
      // 直接跟手(overflow:hidden 容器写 scrollTop 有效);浏览器自动夹在 [0,max]
      scroller.scrollTop = baseTop + dy
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (!dragging) return
      dragging = false
      const dy = startY - e.changedTouches[0].clientY
      const dt = Date.now() - startT
      const pageH = scroller.clientHeight || 1
      // 拖过半屏、或快速轻扫 → 翻一页;否则回弹到当前页
      if (Math.abs(dy) > pageH * 0.25 || (Math.abs(dy) > 18 && dt < 250)) {
        step(dy > 0 ? 1 : -1)
      } else {
        goTo(activeRef.current)
      }
    }

    scroller.addEventListener('wheel', onWheel, { passive: false })
    scroller.addEventListener('touchstart', onTouchStart, { passive: true })
    scroller.addEventListener('touchmove', onTouchMove, { passive: false })
    scroller.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      scroller.removeEventListener('wheel', onWheel)
      scroller.removeEventListener('touchstart', onTouchStart)
      scroller.removeEventListener('touchmove', onTouchMove)
      scroller.removeEventListener('touchend', onTouchEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const jumpTo = (i: number) => goTo(i)

  const activeChapter = LEVELS[active]?.chapterIndex ?? 0

  return (
    <div className="feed" ref={feedRef}>
      {/* 顶部进度浮条 */}
      <div className="feed__progress">
        已悟 <strong>{clearedCount}</strong> / {LEVELS.length} 关
      </div>

      {/* 侧边章节进度轨 */}
      <div className="feed__rail" aria-hidden="true">
        {CHAPTERS.map((ch) => (
          <button
            key={ch.index}
            type="button"
            className={`feed__dot${ch.index === activeChapter ? ' feed__dot--on' : ''}`}
            title={ch.title}
            onClick={() => {
              const first = LEVELS.findIndex((l) => l.chapterIndex === ch.index)
              if (first >= 0) jumpTo(first)
            }}
          />
        ))}
      </div>

      {LEVELS.map((level, i) => {
        const rec = data.levels[level.id]
        const isUnlocked = unlocked[i]
        const done = !!rec?.cleared
        const isLast = i === LEVELS.length - 1
        return (
          <section
            key={level.id}
            data-idx={i}
            ref={(el) => {
              pageRefs.current[i] = el
            }}
            className={`feed__page feed__page--c${level.chapterIndex % 5}${
              isUnlocked ? '' : ' feed__page--locked'
            }`}
          >
            <span className="feed__bignum">{toCnNum(i + 1)}</span>

            <h2 className="feed__title">{level.title}</h2>

            <div className={`feed__board${isUnlocked ? '' : ' feed__board--blur'}`}>
              <Goban
                board={previewBoard(level)}
                toPlay={null}
                markers={level.markers}
                showSmartHints={false}
              />
              {!isUnlocked && <span className="feed__lock">🔒</span>}
            </div>

            <button
              type="button"
              className={`feed__cta${done ? ' feed__cta--done' : ''}`}
              disabled={!isUnlocked}
              onClick={() => isUnlocked && onOpen(level.id)}
            >
              {!isUnlocked ? '尚未解锁' : done ? '重温此关' : '进入此关'}
            </button>

            {!isLast && (
              <div className="feed__swipe">
                <span className="feed__chevron">︿</span>
                上滑下一关
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
