// 音效系统:用 Web Audio API 实时合成,无需任何音频素材文件。
// 通过 sound.configure() 接入设置(开关 / 音量),由设置面板与 localStorage 驱动。

export type SoundName = 'place' | 'capture' | 'win' | 'wrong' | 'click' | 'levelup'

interface SoundSettings {
  sfx: boolean
  volume: number
}

class SoundEngine {
  private ctx: AudioContext | null = null
  private settings: SoundSettings = { sfx: true, volume: 0.6 }

  configure(partial: Partial<SoundSettings>): void {
    this.settings = { ...this.settings, ...partial }
  }

  /** 浏览器要求音频在用户交互后才能启动,首次点击时会自动 resume */
  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!Ctor) return null
      this.ctx = new Ctor()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  private tone(
    freq: number,
    startAt: number,
    dur: number,
    type: OscillatorType,
    peak: number,
  ): void {
    const ctx = this.ctx
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, startAt)
    const v = Math.max(0.0001, peak * this.settings.volume)
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(v, startAt + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(startAt)
    osc.stop(startAt + dur + 0.03)
  }

  play(name: SoundName): void {
    if (!this.settings.sfx) return
    const ctx = this.ensure()
    if (!ctx) return
    const t = ctx.currentTime
    switch (name) {
      case 'place':
        this.tone(300, t, 0.09, 'triangle', 0.5)
        break
      case 'click':
        this.tone(420, t, 0.05, 'square', 0.22)
        break
      case 'capture':
        this.tone(540, t, 0.08, 'triangle', 0.45)
        this.tone(330, t + 0.04, 0.12, 'sine', 0.4)
        break
      case 'wrong':
        this.tone(190, t, 0.16, 'sawtooth', 0.28)
        this.tone(130, t + 0.06, 0.2, 'sawtooth', 0.28)
        break
      case 'win':
        this.tone(523, t, 0.12, 'triangle', 0.4)
        this.tone(659, t + 0.1, 0.12, 'triangle', 0.4)
        this.tone(784, t + 0.2, 0.22, 'triangle', 0.45)
        break
      case 'levelup':
        this.tone(523, t, 0.1, 'triangle', 0.4)
        this.tone(659, t + 0.09, 0.1, 'triangle', 0.4)
        this.tone(784, t + 0.18, 0.1, 'triangle', 0.4)
        this.tone(1047, t + 0.27, 0.26, 'triangle', 0.5)
        break
    }
  }
}

export const sound = new SoundEngine()
