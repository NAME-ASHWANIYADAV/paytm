import { useEffect, useRef, type MutableRefObject } from 'react'

interface WaveformProps {
  analyserRef: MutableRefObject<AnalyserNode | null>
  active: boolean
}

const BARS = 22

/**
 * Level meter driven by the real AnalyserNode on the mic stream — RMS per frequency bucket,
 * mirrored around the centre rule. When idle it draws a single flat ledger line, so nothing
 * animates unless the merchant is actually speaking.
 */
export function Waveform({ analyserRef, active }: WaveformProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const rootStyle = window.getComputedStyle(document.documentElement)
    let frame = 0
    const levels = new Float32Array(BARS)

    const resize = (): void => {
      const ratio = window.devicePixelRatio || 1
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.round(width * ratio))
      canvas.height = Math.max(1, Math.round(height * ratio))
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = (): void => {
      const { width, height } = canvas.getBoundingClientRect()
      const mid = height / 2
      const accent = rootStyle.getPropertyValue('--red').trim() || '#b03528'
      const rule = rootStyle.getPropertyValue('--rule-strong').trim() || '#cdbda1'
      context.clearRect(0, 0, width, height)

      const analyser = analyserRef.current
      if (analyser && active) {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        const bucket = Math.floor(data.length / BARS)
        for (let index = 0; index < BARS; index += 1) {
          let sum = 0
          for (let offset = 0; offset < bucket; offset += 1) {
            const value = data[index * bucket + offset] ?? 0
            sum += value * value
          }
          const rms = Math.sqrt(sum / Math.max(1, bucket)) / 255
          // Slight low-frequency tilt so speech reads as a voice, not a spectrum.
          const shaped = Math.pow(rms, 0.72) * (1 - index / (BARS * 2.6))
          levels[index] = Math.max(shaped, (levels[index] ?? 0) * 0.82)
        }
      } else {
        for (let index = 0; index < BARS; index += 1) levels[index] = 0
      }

      const gap = 2
      const barWidth = (width - gap * (BARS - 1)) / BARS
      context.fillStyle = accent
      for (let index = 0; index < BARS; index += 1) {
        const level = levels[index] ?? 0
        const barHeight = Math.max(1.5, level * (height - 8))
        const x = index * (barWidth + gap)
        context.globalAlpha = active ? 0.35 + level * 0.65 : 0.25
        context.fillRect(x, mid - barHeight / 2, barWidth, barHeight)
      }
      context.globalAlpha = 1

      if (!active) {
        context.strokeStyle = rule
        context.lineWidth = 1
        context.beginPath()
        context.moveTo(0, mid + 0.5)
        context.lineTo(width, mid + 0.5)
        context.stroke()
      }

      frame = window.requestAnimationFrame(draw)
    }

    if (active) {
      frame = window.requestAnimationFrame(draw)
    } else {
      draw()
      window.cancelAnimationFrame(frame)
      frame = 0
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [active, analyserRef])

  return (
    <canvas
      ref={canvasRef}
      className="waveform"
      role="img"
      aria-label={active ? 'Live microphone level' : 'Microphone idle'}
    />
  )
}
