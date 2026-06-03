import type { Settings } from '../storage/progress'

interface SettingsViewProps {
  settings: Settings
  onChange: (partial: Partial<Settings>) => void
  onReset: () => void
}

export function SettingsView({ settings, onChange, onReset }: SettingsViewProps) {
  return (
    <div className="settings">
      <div className="setting-row">
        <span>音效</span>
        <button
          type="button"
          className={`toggle ${settings.sfx ? 'toggle--on' : ''}`}
          onClick={() => onChange({ sfx: !settings.sfx })}
        >
          {settings.sfx ? '开' : '关'}
        </button>
      </div>

      <div className="setting-row">
        <span>音量</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(settings.volume * 100)}
          onChange={(e) => onChange({ volume: Number(e.target.value) / 100 })}
        />
      </div>

      <div className="setting-row">
        <span>学习进度</span>
        <button type="button" className="btn btn--ghost" onClick={onReset}>
          清空进度
        </button>
      </div>

      <p className="settings__note">
        通关记录与设置都保存在本机浏览器里(纯前端,无需登录)。
      </p>
    </div>
  )
}
