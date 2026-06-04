import { useEffect, useState } from 'react'
import { MapView } from './components/MapView'
import { LevelPlayer } from './components/LevelPlayer'
import { getLevel, nextLevel } from './levels/data'
import { sound } from './audio/sound'
import { loadProgress, recordClear, updateSettings } from './storage/progress'
import type { ProgressData, Settings } from './storage/progress'
import './App.css'

type Route =
  | { v: 'map' }
  | { v: 'level'; id: string }

function App() {
  const [route, setRoute] = useState<Route>({ v: 'map' })
  const [data, setData] = useState<ProgressData>(() => loadProgress())

  // 设置变化时同步给音效引擎
  useEffect(() => {
    sound.configure({ sfx: data.settings.sfx, volume: data.settings.volume })
  }, [data.settings])

  // 背景音乐:仅在关卡内、且音乐开启时播放
  useEffect(() => {
    if (route.v === 'level' && data.settings.music) sound.startBgm()
    else sound.stopBgm()
  }, [route.v, data.settings.music])

  function handleWin(levelId: string, stars: number) {
    setData((d) => recordClear(d, levelId, stars))
  }

  function changeSettings(partial: Partial<Settings>) {
    setData((d) => updateSettings(d, partial))
  }

  function toggleMusic() {
    sound.play('click')
    changeSettings({ music: !data.settings.music })
  }

  const level = route.v === 'level' ? getLevel(route.id) : undefined
  const immersive = route.v === 'level' // 关卡内：沉浸下棋，隐藏标题栏入口
  const feed = route.v === 'map' // 首页：抖音式整屏滑动闯关

  return (
    <div className={`app${immersive ? ' app--immersive' : ''}${feed ? ' app--feed' : ''}`}>
      {!immersive && (
        <nav className="appbar__actions">
          <button
            type="button"
            className={`appbar__music${data.settings.music ? ' appbar__music--on' : ''}`}
            onClick={toggleMusic}
            aria-label={data.settings.music ? '关闭音乐' : '开启音乐'}
            title={data.settings.music ? '关闭音乐' : '开启音乐'}
          >
            {data.settings.music ? '🎵' : '🔇'}
          </button>
        </nav>
      )}

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
      </main>
    </div>
  )
}

export default App
