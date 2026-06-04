import type { Settings } from '../storage/progress'

interface SettingsViewProps {
  settings: Settings
  onChange: (partial: Partial<Settings>) => void
}

export function SettingsView({ settings, onChange }: SettingsViewProps) {
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

      <p className="settings__note">
        通关记录与设置都保存在本机浏览器里(纯前端,无需登录)。
      </p>
    </div>
  )
}
