// 音效系统(小程序版):播放打包内置的短 wav 音效(由 scripts/gen-sfx.mjs 离线合成)。
// 通过 sound.configure() 接入设置(开关 / 音量),由设置与本地存储驱动。
// 注:BGM 因主包体积限制暂未内置,startBgm/stopBgm 保留接口以便后续接 CDN。
import Taro from '@tarojs/taro'

export type SoundName = 'place' | 'capture' | 'win' | 'wrong' | 'click' | 'levelup'

interface SoundSettings {
  sfx: boolean
  volume: number
}

const SRC: Record<SoundName, string> = {
  place: '/assets/sfx/place.wav',
  capture: '/assets/sfx/capture.wav',
  win: '/assets/sfx/win.wav',
  wrong: '/assets/sfx/wrong.wav',
  click: '/assets/sfx/click.wav',
  levelup: '/assets/sfx/levelup.wav',
}

class SoundEngine {
  private settings: SoundSettings = { sfx: true, volume: 0.6 }
  private pool = new Map<SoundName, Taro.InnerAudioContext>()

  configure(partial: Partial<SoundSettings>): void {
    this.settings = { ...this.settings, ...partial }
  }

  private ensure(name: SoundName): Taro.InnerAudioContext | null {
    let ctx = this.pool.get(name)
    if (!ctx) {
      try {
        ctx = Taro.createInnerAudioContext()
        ctx.src = SRC[name]
        this.pool.set(name, ctx)
      } catch {
        return null
      }
    }
    return ctx
  }

  play(name: SoundName): void {
    if (!this.settings.sfx) return
    const ctx = this.ensure(name)
    if (!ctx) return
    try {
      ctx.volume = Math.max(0, Math.min(1, this.settings.volume))
      ctx.stop()
      ctx.play()
    } catch {
      /* 个别机型音频初始化失败时静默 */
    }
  }

  // ===== 背景音乐(暂缺素材,保留接口) =====
  startBgm(): void {}
  stopBgm(): void {}
}

export const sound = new SoundEngine()
