// 离线合成音效 wav(还原 web 版 Web Audio 的合成参数)。
// 运行: node scripts/gen-sfx.mjs  → 输出到 src/assets/sfx/*.wav
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SR = 22050
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../src/assets/sfx')
mkdirSync(OUT, { recursive: true })

function osc(type, freq, t) {
  const p = (freq * t) % 1
  switch (type) {
    case 'sine': return Math.sin(2 * Math.PI * p)
    case 'square': return p < 0.5 ? 1 : -1
    case 'sawtooth': return 2 * p - 1
    case 'triangle': return p < 0.5 ? 4 * p - 1 : 3 - 4 * p
  }
}

/** 单音:attack 8ms 后指数衰减,与 web 版 tone() 包络一致 */
function tone(buf, freq, startAt, dur, type, peak) {
  const a = 0.008
  const n0 = Math.floor(startAt * SR)
  const n1 = Math.min(buf.length, Math.floor((startAt + dur + 0.03) * SR))
  for (let n = n0; n < n1; n++) {
    const t = n / SR - startAt
    let env
    if (t < a) env = peak * (t / a)
    else env = peak * Math.pow(0.0001 / peak, (t - a) / (dur - a)) // 指数衰减到 ~0
    if (!(env > 0)) continue
    buf[n] += env * osc(type, freq, t)
  }
}

function wav(buf) {
  const pcm = new Int16Array(buf.length)
  for (let i = 0; i < buf.length; i++) {
    pcm[i] = Math.max(-1, Math.min(1, buf[i])) * 32767
  }
  const data = Buffer.from(pcm.buffer)
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8)
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34)
  h.write('data', 36); h.writeUInt32LE(data.length, 40)
  return Buffer.concat([h, data])
}

function make(name, dur, fn) {
  const buf = new Float64Array(Math.ceil(dur * SR))
  fn(buf)
  writeFileSync(join(OUT, `${name}.wav`), wav(buf))
  console.log(`${name}.wav  ${(wav(buf).length / 1024).toFixed(1)} KB`)
}

make('place', 0.16, (b) => tone(b, 300, 0, 0.09, 'triangle', 0.5))
make('click', 0.1, (b) => tone(b, 420, 0, 0.05, 'square', 0.22))
make('capture', 0.22, (b) => {
  tone(b, 540, 0, 0.08, 'triangle', 0.45)
  tone(b, 330, 0.04, 0.12, 'sine', 0.4)
})
make('wrong', 0.32, (b) => {
  tone(b, 190, 0, 0.16, 'sawtooth', 0.28)
  tone(b, 130, 0.06, 0.2, 'sawtooth', 0.28)
})
make('win', 0.5, (b) => {
  tone(b, 523, 0, 0.12, 'triangle', 0.4)
  tone(b, 659, 0.1, 0.12, 'triangle', 0.4)
  tone(b, 784, 0.2, 0.22, 'triangle', 0.45)
})
make('levelup', 0.6, (b) => {
  tone(b, 523, 0, 0.1, 'triangle', 0.4)
  tone(b, 659, 0.09, 0.1, 'triangle', 0.4)
  tone(b, 784, 0.18, 0.1, 'triangle', 0.4)
  tone(b, 1047, 0.27, 0.26, 'triangle', 0.5)
})
