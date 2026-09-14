/**
 * Microphone capture for the live-call panel.
 *
 * MediaRecorder produces the blob we POST to `/api/voice/transcribe`; a parallel AnalyserNode
 * on the same stream drives the waveform, so the meter shows the merchant's actual voice
 * rather than a decorative loop.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
]

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

export interface RecorderApi {
  supported: boolean
  recording: boolean
  error: string
  /** Live analyser for the waveform; null unless recording. */
  analyserRef: React.MutableRefObject<AnalyserNode | null>
  start: () => Promise<void>
  stop: () => Promise<Blob | null>
  clearError: () => void
}

export function useRecorder(): RecorderApi {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const supported =
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)

  const teardown = useCallback(() => {
    analyserRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    const context = contextRef.current
    contextRef.current = null
    if (context && context.state !== 'closed') void context.close()
    recorderRef.current = null
  }, [])

  useEffect(() => teardown, [teardown])

  const start = useCallback(async () => {
    if (!supported || recorderRef.current) return
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream

      const context = new AudioContext()
      contextRef.current = context
      const analyser = context.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.72
      context.createMediaStreamSource(stream).connect(analyser)
      analyserRef.current = analyser

      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorderRef.current = recorder
      recorder.start(120)
      setRecording(true)
    } catch (cause) {
      teardown()
      setRecording(false)
      const message = cause instanceof Error ? cause.message : 'microphone unavailable'
      setError(
        message.toLowerCase().includes('denied')
          ? 'Mic ki ijaazat nahi mili — neeche type karke poochhiye.'
          : `Mic nahi chala: ${message}`,
      )
    }
  }, [supported, teardown])

  const stop = useCallback(async (): Promise<Blob | null> => {
    const recorder = recorderRef.current
    if (!recorder) return null
    const mimeType = recorder.mimeType || 'audio/webm'
    const blob = await new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        resolve(chunksRef.current.length ? new Blob(chunksRef.current, { type: mimeType }) : null)
      }
      if (recorder.state !== 'inactive') recorder.stop()
      else resolve(null)
    })
    chunksRef.current = []
    teardown()
    setRecording(false)
    return blob
  }, [teardown])

  const clearError = useCallback(() => setError(''), [])

  return { supported, recording, error, analyserRef, start, stop, clearError }
}
