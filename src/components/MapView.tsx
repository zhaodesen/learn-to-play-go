import { CHAPTERS, LEVELS } from '../levels/data'
import type { ProgressData } from '../storage/progress'

interface MapViewProps {
  data: ProgressData
  onOpen: (id: string) => void
}

export function MapView({ data, onOpen }: MapViewProps) {
  const clearedCount = LEVELS.filter((l) => data.levels[l.id]?.cleared).length

  return (
    <div className="map">
      <p className="map__progress">
        已通关 <strong>{clearedCount}</strong> / {LEVELS.length} 关
      </p>

      {CHAPTERS.map((ch) => {
        const chapterLevels = LEVELS.filter((l) => l.chapterIndex === ch.index)
        return (
          <section key={ch.index} className="chapter">
            <h2 className="chapter__title">
              第 {ch.index + 1} 章 · {ch.title}
              <span className="chapter__sub">{ch.subtitle}</span>
            </h2>
            <div className="level-grid">
              {chapterLevels.map((l) => {
                const allIdx = LEVELS.findIndex((x) => x.id === l.id)
                const unlocked =
                  allIdx === 0 || !!data.levels[LEVELS[allIdx - 1].id]?.cleared
                const rec = data.levels[l.id]
                const cls =
                  'level-btn' +
                  (rec?.cleared ? ' level-btn--done' : '') +
                  (unlocked ? '' : ' level-btn--locked')
                return (
                  <button
                    key={l.id}
                    type="button"
                    className={cls}
                    disabled={!unlocked}
                    onClick={() => onOpen(l.id)}
                  >
                    <span className="level-btn__no">{l.index}</span>
                    <span className="level-btn__name">{l.title}</span>
                    <span className="level-btn__stars">
                      {!unlocked
                        ? '🔒'
                        : rec
                          ? '★'.repeat(rec.stars) + '☆'.repeat(3 - rec.stars)
                          : '未通关'}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
