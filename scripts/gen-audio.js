// Generates simple WAV sound effects for the football game.
const fs = require('fs')
const path = require('path')

const SAMPLE_RATE = 44100

function writeWav(filePath, samples) {
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = SAMPLE_RATE * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = samples.length * (bitsPerSample / 8)
  const buf = Buffer.alloc(44 + dataSize)

  // WAV header
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataSize, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16) // chunk size
  buf.writeUInt16LE(1, 20)  // PCM
  buf.writeUInt16LE(numChannels, 22)
  buf.writeUInt32LE(SAMPLE_RATE, 24)
  buf.writeUInt32LE(byteRate, 28)
  buf.writeUInt16LE(blockAlign, 32)
  buf.writeUInt16LE(bitsPerSample, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2)
  }

  fs.writeFileSync(filePath, buf)
}

function sine(freq, duration, amplitude = 0.5) {
  const n = Math.floor(SAMPLE_RATE * duration)
  const samples = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const env = Math.min(1, (n - i) / (SAMPLE_RATE * 0.05)) // tiny fade-out
    samples[i] = Math.sin(2 * Math.PI * freq * t) * amplitude * env
  }
  return samples
}

function noise(duration, amplitude = 0.3) {
  const n = Math.floor(SAMPLE_RATE * duration)
  const samples = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, (n - i) / (SAMPLE_RATE * 0.05))
    samples[i] = (Math.random() * 2 - 1) * amplitude * env
  }
  return samples
}

function sineWithHarmonics(freqs, duration, amplitude = 0.4) {
  const n = Math.floor(SAMPLE_RATE * duration)
  const samples = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const env = Math.min(1, (n - i) / (SAMPLE_RATE * 0.1))
    let val = 0
    for (const [f, a] of freqs) {
      val += Math.sin(2 * Math.PI * f * t) * a
    }
    samples[i] = val * amplitude * env
  }
  return samples
}

const audioDir = path.join(__dirname, '..', 'client', 'public', 'audio')

// kick.ogg (or .wav) — short thud, 150ms
writeWav(path.join(audioDir, 'kick.wav'), sineWithHarmonics([[80, 1], [160, 0.5]], 0.15, 0.7))

// goal.ogg — celebratory horn, 1.2s
writeWav(path.join(audioDir, 'goal.wav'), sineWithHarmonics([[440, 0.6], [554, 0.5], [659, 0.7], [880, 0.4]], 1.2, 0.6))

// whistle-short.ogg — quick chirp, 0.3s
writeWav(path.join(audioDir, 'whistle-short.wav'), sineWithHarmonics([[1200, 0.8], [1800, 0.6], [2400, 0.4]], 0.3, 0.5))

// whistle-long.ogg — longer whistle, 1.0s
writeWav(path.join(audioDir, 'whistle-long.wav'), sineWithHarmonics([[1200, 0.8], [1800, 0.6], [2400, 0.4]], 1.0, 0.5))

// menu-click.ogg — short click, 0.08s
writeWav(path.join(audioDir, 'menu-click.wav'), sine(800, 0.08, 0.4))

// countdown-beep.ogg — beep, 0.25s
writeWav(path.join(audioDir, 'countdown-beep.wav'), sine(880, 0.25, 0.5))

console.log('Audio files generated in:', audioDir)
