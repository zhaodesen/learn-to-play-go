import { useEffect, useState } from 'react'
import { MapView } from './components/MapView'
import { LevelPlayer } from './components/LevelPlayer'
import { PlayView } from './components/PlayView'
import { GlossaryView } from './components/GlossaryView'
import { SettingsView } from './components/SettingsView'
import { Taiji } from './components/Taiji'
import { getLevel, nextLevel } from './levels/data'
import { sound } from './audio/sound'
import { loadProgress, recordClear, updateSettings } from './storage/progress'
import type { ProgressData, Settings } from './storage/progress'
import './App.css'

type Route =
  | { v: 'map' }
  | { v: 'level'; id: string }
  | { v: 'play' }
  | { v: 'glossary' }
  | { v: 'settings' }

const ACTIONS: { v: Route['v']; label: string; glyph: string }[] = [
  { v: 'play', label: '对弈', glyph: '棋' },
  { v: 'glossary', label: '词典', glyph: '典' },
  { v: 'settings', label: '设置', glyph: '设' },
]

function App() {
  const [route, setRoute] = useState<Route>({ v: 'map' })
  const [data, setData] = useState<ProgressData>(() => loadProgress())

  // 设置变化时同步给音效引擎
  useEffect(() => {
    sound.configure({ sfx: data.settings.sfx, volume: data.settings.volume })
  }, [data.settings])

  function handleWin(levelId: string, stars: number) {
    setData((d) => recordClear(d, levelId, stars))
  }

  function changeSettings(partial: Partial<Settings>) {
    setData((d) => updateSettings(d, partial))
  }

  function go(v: Route['v']) {
    sound.play('click')
    setRoute({ v } as Route)
  }

  const level = route.v === 'level' ? getLevel(route.id) : undefined
  const immersive = route.v === 'level' // 关卡内：沉浸下棋，隐藏标题栏入口
  const feed = route.v === 'map' // 首页：抖音式整屏滑动闯关

  return (
    <div className={`app${immersive ? ' app--immersive' : ''}${feed ? ' app--feed' : ''}`}>
      <header className="appbar">
        <button
          type="button"
          className="appbar__brand"
          onClick={() => setRoute({ v: 'map' })}
        >
          <Taiji size={30} />
          <span className="appbar__title">墨韵围棋</span>
        </button>

        {!immersive && (
          <nav className="appbar__actions">
            {ACTIONS.map((a) => (
              <button
                key={a.v}
                type="button"
                className={`appbar__act${route.v === a.v ? ' appbar__act--on' : ''}`}
                onClick={() => go(a.v)}
              >
                <span className="appbar__act-glyph">{a.glyph}</span>
                <span className="appbar__act-label">{a.label}</span>
              </button>
            ))}
          </nav>
        )}
      </header>

      <main className="main">
        {route.v === 'map' && (
          <MapView
            data={data}
            onOpen={(id) => {
              sound.play('click')
              setRoute({ v: 'level', id })
            }}
          />
        )}

        {route.v === 'level' && level && (
          <LevelPlayer
            key={level.id}
            level={level}
            hasNext={!!nextLevel(level.id)}
            onWin={handleWin}
            onExit={() => setRoute({ v: 'map' })}
            onNext={() => {
              const n = nextLevel(level.id)
              setRoute(n ? { v: 'level', id: n.id } : { v: 'map' })
            }}
          />
        )}

        {route.v === 'level' && !level && (
          <p className="tagline">找不到这一关。</p>
        )}

        {route.v === 'play' && <PlayView onExit={() => setRoute({ v: 'map' })} />}

        {route.v === 'glossary' && <GlossaryView />}

        {route.v === 'settings' && (
          <SettingsView settings={data.settings} onChange={changeSettings} />
        )}
      </main>
    </div>
  )
}

export default App
