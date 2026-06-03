import { useEffect, useState } from 'react'
import { MapView } from './components/MapView'
import { LevelPlayer } from './components/LevelPlayer'
import { GlossaryView } from './components/GlossaryView'
import { SettingsView } from './components/SettingsView'
import { getLevel, nextLevel } from './levels/data'
import { sound } from './audio/sound'
import {
  loadProgress,
  recordClear,
  resetProgress,
  updateSettings,
} from './storage/progress'
import type { ProgressData, Settings } from './storage/progress'
import './App.css'

type Route =
  | { v: 'map' }
  | { v: 'level'; id: string }
  | { v: 'glossary' }
  | { v: 'settings' }

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

  function handleReset() {
    if (window.confirm('确定要清空所有通关进度吗?此操作不可恢复。')) {
      setData(resetProgress())
    }
  }

  const level = route.v === 'level' ? getLevel(route.id) : undefined

  return (
    <div className="app">
      <header className="header">
        <button
          type="button"
          className="header__home"
          onClick={() => setRoute({ v: 'map' })}
        >
          ⌂ 围棋入门
        </button>
        <nav className="header__nav">
          <button
            type="button"
            onClick={() => {
              sound.play('click')
              setRoute({ v: 'glossary' })
            }}
          >
            术语词典
          </button>
          <button
            type="button"
            onClick={() => {
              sound.play('click')
              setRoute({ v: 'settings' })
            }}
          >
            设置
          </button>
        </nav>
      </header>

      <main className="main">
        {route.v === 'map' && (
          <>
            <p className="tagline">通过闯关,从零学会下围棋</p>
            <MapView
              data={data}
              onOpen={(id) => {
                sound.play('click')
                setRoute({ v: 'level', id })
              }}
            />
          </>
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

        {route.v === 'glossary' && <GlossaryView />}

        {route.v === 'settings' && (
          <SettingsView
            settings={data.settings}
            onChange={changeSettings}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  )
}

export default App
