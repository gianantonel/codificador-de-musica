import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const PLANETS = [
  { size: 110, orbit: 26, top: 13, left: 8, hue: 285, speed: 42 },
  { size: 62, orbit: 18, top: 70, left: 12, hue: 185, speed: 34 },
  { size: 88, orbit: 23, top: 22, left: 83, hue: 28, speed: 52 },
  { size: 44, orbit: 15, top: 76, left: 78, hue: 318, speed: 28 },
  { size: 36, orbit: 11, top: 48, left: 92, hue: 88, speed: 38 }
]

function makeStars(count = 140) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: `${1 + Math.random() * 2.8}px`,
    delay: `${Math.random() * 6}s`,
    duration: `${2.4 + Math.random() * 4.8}s`
  }))
}

function SpaceBackground() {
  const stars = useMemo(() => makeStars(), [])
  return <div className="space-bg" aria-hidden="true">
    <div className="nebula nebula-a" />
    <div className="nebula nebula-b" />
    <div className="starfield">
      {stars.map(star => <span key={star.id} className="star" style={star} />)}
    </div>
    {PLANETS.map((planet, i) => <span
      key={i}
      className="planet"
      style={{
        '--size': `${planet.size}px`,
        '--orbit': `${planet.orbit}px`,
        '--hue': planet.hue,
        '--speed': `${planet.speed}s`,
        top: `${planet.top}%`,
        left: `${planet.left}%`
      }}
    />)}
    <div className="comet comet-a" />
    <div className="comet comet-b" />
  </div>
}

function drawCymatics(ctx, canvas, frequencyData, timeData, isPlaying, elapsed) {
  const dpr = window.devicePixelRatio || 1
  const w = canvas.width / dpr
  const h = canvas.height / dpr
  ctx.clearRect(0, 0, w, h)

  const bass = average(frequencyData, 0, 18) / 255
  const lowMid = average(frequencyData, 18, 64) / 255
  const mid = average(frequencyData, 64, 160) / 255
  const high = average(frequencyData, 160, frequencyData.length) / 255
  const energy = Math.min(1, bass * 0.42 + lowMid * 0.25 + mid * 0.22 + high * 0.2 + (isPlaying ? 0.04 : 0.015))
  const t = elapsed * 0.001

  const bgGrad = ctx.createRadialGradient(w * .5, h * .48, 12, w * .5, h * .5, Math.max(w, h) * .72)
  bgGrad.addColorStop(0, `hsla(${(310 + bass * 95 + t * 22) % 360}, 100%, ${7 + energy * 12}%, 1)`)
  bgGrad.addColorStop(.45, `hsla(${(182 + mid * 140) % 360}, 100%, ${5 + energy * 10}%, 1)`)
  bgGrad.addColorStop(1, 'rgba(0, 0, 0, 1)')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, w, h)

  const cx = w / 2
  const cy = h / 2
  const minR = Math.min(w, h) * .16
  const maxR = Math.min(w, h) * .48
  const rings = 18
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  for (let r = 0; r < rings; r++) {
    const ringNorm = r / (rings - 1)
    const points = 360
    const freqIndex = Math.floor(ringNorm * (frequencyData.length - 1))
    const amp = (frequencyData[freqIndex] || 0) / 255
    const radius = minR + ringNorm * maxR + Math.sin(t * 2 + r) * 6 * (0.3 + amp)
    const harmonicA = 2 + Math.round(bass * 9) + (r % 4)
    const harmonicB = 4 + Math.round(mid * 13) + (r % 7)
    const hue = (t * 42 + r * 23 + bass * 160 + high * 210) % 360
    ctx.beginPath()
    for (let i = 0; i <= points; i++) {
      const a = (i / points) * Math.PI * 2
      const wave = Math.sin(a * harmonicA + t * (1.2 + bass * 4))
      const fold = Math.cos(a * harmonicB - t * (1.5 + high * 7))
      const cym = Math.sin(Math.cos(a * (3 + r % 5)) * 3 + t + lowMid * 6)
      const dataWave = (timeData[(i * 2 + r * 17) % timeData.length] - 128) / 128
      const distortion = (wave * bass + fold * mid + cym * high + dataWave * .55) * (8 + energy * 54)
      const rr = radius + distortion
      const x = cx + Math.cos(a) * rr * (1 + 0.08 * Math.sin(a * 2 + t))
      const y = cy + Math.sin(a) * rr * (0.62 + 0.2 * Math.cos(a * 2 - t * .7))
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.strokeStyle = `hsla(${hue}, 100%, ${56 + amp * 36}%, ${0.18 + amp * 0.6})`
    ctx.lineWidth = 1.2 + amp * 5.5
    ctx.shadowBlur = 18 + amp * 45
    ctx.shadowColor = `hsl(${(hue + 180) % 360}, 100%, 62%)`
    ctx.stroke()
  }

  for (let i = 0; i < 42; i++) {
    const idx = Math.floor((i / 42) * frequencyData.length)
    const amp = frequencyData[idx] / 255
    const a = (i / 42) * Math.PI * 2 + t * (.18 + high)
    const r = minR * .55 + amp * maxR * .92
    const hue = (i * 41 + t * 70 + amp * 220) % 360
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .64, 2 + amp * 9, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${hue}, 100%, 62%, ${0.35 + amp * .65})`
    ctx.shadowBlur = 24 + amp * 50
    ctx.shadowColor = `hsl(${(hue + 145) % 360}, 100%, 60%)`
    ctx.fill()
  }

  ctx.globalCompositeOperation = 'source-over'
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(255,255,255,.9)'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, w - 2, h - 2)
  ctx.restore()
}

function average(arr, start, end) {
  let sum = 0
  const lim = Math.min(end, arr.length)
  for (let i = start; i < lim; i++) sum += arr[i]
  return sum / Math.max(1, lim - start)
}

function App() {
  const canvasRef = useRef(null)
  const audioRef = useRef(null)
  const contextRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const rafRef = useRef(null)
  const demoOscRef = useRef(null)
  const demoGainRef = useRef(null)
  const [trackName, setTrackName] = useState('Modo demo cósmico')
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.82)
  const [status, setStatus] = useState('Cargá un audio o iniciá el demo para ver la placa cimática reaccionar.')

  const setupAudio = useCallback(async () => {
    if (!contextRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      const context = new Ctx()
      const analyser = context.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.82
      analyser.connect(context.destination)
      contextRef.current = context
      analyserRef.current = analyser
    }
    if (contextRef.current.state === 'suspended') await contextRef.current.resume()
    return { context: contextRef.current, analyser: analyserRef.current }
  }, [])

  const connectElement = useCallback(async () => {
    const { context, analyser } = await setupAudio()
    if (!sourceRef.current && audioRef.current) {
      const source = context.createMediaElementSource(audioRef.current)
      source.connect(analyser)
      sourceRef.current = source
    }
  }, [setupAudio])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let freq = new Uint8Array(1024)
    let time = new Uint8Array(1024)
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const frame = (now) => {
      const analyser = analyserRef.current
      if (analyser) {
        if (freq.length !== analyser.frequencyBinCount) {
          freq = new Uint8Array(analyser.frequencyBinCount)
          time = new Uint8Array(analyser.frequencyBinCount)
        }
        analyser.getByteFrequencyData(freq)
        analyser.getByteTimeDomainData(time)
      } else {
        for (let i = 0; i < freq.length; i++) {
          freq[i] = 18 + Math.max(0, Math.sin(now * 0.0014 + i * 0.045)) * 85 + Math.max(0, Math.sin(now * 0.003 + i * 0.19)) * 80
          time[i] = 128 + Math.sin(now * 0.004 + i * 0.08) * 45
        }
      }
      drawCymatics(ctx, canvas, freq, time, isPlaying, now)
      rafRef.current = requestAnimationFrame(frame)
    }
    resize()
    window.addEventListener('resize', resize)
    rafRef.current = requestAnimationFrame(frame)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
    if (demoGainRef.current) demoGainRef.current.gain.value = isPlaying ? volume * 0.055 : 0
  }, [volume, isPlaying])

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    await stopDemo()
    await connectElement()
    const url = URL.createObjectURL(file)
    audioRef.current.src = url
    audioRef.current.volume = volume
    setTrackName(file.name.replace(/\.[^.]+$/, ''))
    setStatus('Audio cargado. Presioná reproducir para activar la visualización con tus frecuencias reales.')
    setIsPlaying(false)
  }

  const toggleAudio = async () => {
    await connectElement()
    if (!audioRef.current.src) return startDemo()
    if (audioRef.current.paused) {
      await audioRef.current.play()
      setIsPlaying(true)
      setStatus('Analizando espectro de audio en tiempo real.')
    } else {
      audioRef.current.pause()
      setIsPlaying(false)
      setStatus('Pausa. La placa conserva una respiración visual mínima.')
    }
  }

  const startDemo = async () => {
    const { context, analyser } = await setupAudio()
    if (!demoOscRef.current) {
      const master = context.createGain()
      const oscA = context.createOscillator()
      const oscB = context.createOscillator()
      const lfo = context.createOscillator()
      const lfoGain = context.createGain()
      oscA.type = 'sawtooth'
      oscB.type = 'triangle'
      lfo.type = 'sine'
      oscA.frequency.value = 82
      oscB.frequency.value = 164
      lfo.frequency.value = 0.17
      lfoGain.gain.value = 42
      lfo.connect(lfoGain)
      lfoGain.connect(oscA.frequency)
      oscA.connect(master)
      oscB.connect(master)
      master.gain.value = volume * 0.055
      master.connect(analyser)
      oscA.start(); oscB.start(); lfo.start()
      demoOscRef.current = [oscA, oscB, lfo]
      demoGainRef.current = master
    }
    if (audioRef.current) audioRef.current.pause()
    demoGainRef.current.gain.value = volume * 0.055
    setTrackName('Modo demo cósmico')
    setStatus('Demo generativo activo: frecuencias sintéticas alimentan la cimática.')
    setIsPlaying(true)
  }

  const stopDemo = async () => {
    if (demoGainRef.current) demoGainRef.current.gain.value = 0
  }

  const stopAll = () => {
    if (audioRef.current) audioRef.current.pause()
    if (demoGainRef.current) demoGainRef.current.gain.value = 0
    setIsPlaying(false)
    setStatus('Detenido. Elegí un audio o reiniciá el demo.')
  }

  return <main className="app-shell">
    <SpaceBackground />
    <section className="hero-panel">
      <p className="eyebrow">CODIFICADOR DE MÚSICA</p>
      <h1>Universo audio-reactivo con cimática cromática</h1>
      <p className="lead">Un reproductor visual inspirado en tu Custom Gian Spotify: fondo negro espacial, planetas en movimiento y una placa central que transforma frecuencias en patrones saturados y complementarios.</p>
    </section>

    <section className="visual-stage" aria-label="Visualizador cimático">
      <div className="white-plate">
        <canvas ref={canvasRef} className="cymatics-canvas" />
      </div>
    </section>

    <section className="player-card">
      <div className="track-meta">
        <span className="pulse" data-playing={isPlaying} />
        <div>
          <p>Ahora codificando</p>
          <h2>{trackName}</h2>
        </div>
      </div>
      <div className="controls-row">
        <label className="file-button">
          Cargar audio
          <input type="file" accept="audio/*" onChange={handleFile} />
        </label>
        <button className="round-button primary" onClick={toggleAudio}>{isPlaying ? 'Pausar' : 'Reproducir'}</button>
        <button className="round-button" onClick={startDemo}>Demo</button>
        <button className="round-button" onClick={stopAll}>Stop</button>
      </div>
      <div className="volume-row">
        <span>Volumen</span>
        <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))} />
      </div>
      <p className="status-text">{status}</p>
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} crossOrigin="anonymous" />
    </section>

    <footer>Todos los derechos reservados para Gianfranco Antonel</footer>
  </main>
}

createRoot(document.getElementById('root')).render(<App />)
