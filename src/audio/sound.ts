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
  private bgmTimer: number | null = null
  private bgmOn = false
  private bgmStep = 0

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

  // ===== 背景音乐 =====
  // 用五声音阶(宫商角徵羽)缓慢琶音循环,营造轻松禅意氛围;纯合成,无素材文件。
  // 不受 sfx 开关影响,由设置里的 music 单独控制。

  /** 一个绵长柔和的音符:慢起慢落,正弦波叠加,音量偏低 */
  private softTone(freq: number, dur: number, peak: number): void {
    const ctx = this.ctx
    if (!ctx) return
    const start = ctx.currentTime + 0.02
    const v = Math.max(0.0001, peak * this.settings.volume)
    const make = (f: number, p: number, type: OscillatorType) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(f, start)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(p, start + dur * 0.25)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + dur + 0.05)
    }
    make(freq, v, 'sine')
    make(freq * 2, v * 0.18, 'triangle') // 一点泛音增加质感
  }

  startBgm(): void {
    if (this.bgmOn) return
    const ctx = this.ensure()
    if (!ctx) return
    this.bgmOn = true
    // 羽调式五声音阶,横跨两个八度,旋律线缓慢上下行
    const scale = [
      330, 392, 440, 523, 587,
      659, 587, 523, 440, 392,
    ]
    const tick = () => {
      if (!this.bgmOn) return
      const note = scale[this.bgmStep % scale.length]
      this.softTone(note, 2.0, 0.16)
      // 每隔几拍补一个低音根音,垫住氛围
      if (this.bgmStep % 4 === 0) this.softTone(165, 3.2, 0.1)
      this.bgmStep++
      this.bgmTimer = window.setTimeout(tick, 1600)
    }
    tick()
  }

  stopBgm(): void {
    this.bgmOn = false
    if (this.bgmTimer !== null) {
      window.clearTimeout(this.bgmTimer)
      this.bgmTimer = null
    }
  }
}

export const sound = new SoundEngine()
