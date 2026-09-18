/**
 * Real speech-to-text in the browser, when the browser has it.
 *
 * The Web Speech API (Chrome, incl. Android Chrome and installed PWAs) does genuine Hindi
 * recognition with no vendor key — which matters, because without a Sarvam key the backend's
 * STT is the offline twin, an envelope decoder that cannot hear real audio. Where this API
 * exists, speaking works tonight; where it does not (Android WebView inside the APK, Firefox),
 * the caller falls back to MediaRecorder → /api/voice/transcribe, which upgrades itself the
 * moment a Sarvam key lands.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type CapacitorSpeechPlugin = {
  available: () => Promise<{ available: boolean }>
  requestPermissions: () => Promise<unknown>
  start: (options: {
    language: string
    maxResults: number
    partialResults: boolean
    popup: boolean
  }) => Promise<{ matches?: string[] }>
  stop: () => Promise<void>
}

/** The native Android recognizer, when this page is running inside the Capacitor APK.

    Reached through the window bridge on purpose: the web bundle must not import Capacitor
    (react + react-dom are the only runtime dependencies), and the bridge object simply is not
    there in an ordinary browser, where the Web Speech API path below takes over. */
function capacitorSpeech(): CapacitorSpeechPlugin | null {
  if (typeof window === 'undefined') return null
  const bridge = (
    window as unknown as {
      Capacitor?: { Plugins?: { SpeechRecognition?: CapacitorSpeechPlugin } }
    }
  ).Capacitor
  return bridge?.Plugins?.SpeechRecognition ?? null
}

function recognitionClass(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition
    webkitSpeechRecognition?: new () => Recognition
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export interface SpeechInputApi {
  /** Whether this browser can transcribe locally. Decides which mic pipeline the page uses. */
  supported: boolean
  listening: boolean
  error: string
  /** Begin listening; resolves through `onText` exactly once with the final transcript. */
  start: (lang: string, onText: (text: string) => void) => void
  stop: () => void
}

export function useSpeechInput(): SpeechInputApi {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const activeRef = useRef<Recognition | null>(null)

  const supported = capacitorSpeech() !== null || recognitionClass() !== null

  useEffect(
    () => () => {
      activeRef.current?.abort()
      activeRef.current = null
    },
    [],
  )

  const stop = useCallback(() => {
    // stop() (not abort): lets a final result that is already in flight still arrive.
    void capacitorSpeech()?.stop().catch(() => {})
    activeRef.current?.stop()
  }, [])

  const start = useCallback((lang: string, onText: (text: string) => void) => {
    const native = capacitorSpeech()
    if (native) {
      // popup:true = the platform's own Google mic dialog. It handles start/stop sounds,
      // partials and cancellation itself and hands back final matches — the most reliable
      // capture there is on a demo floor.
      setError('')
      setListening(true)
      void (async () => {
        try {
          await native.requestPermissions()
          const result = await native.start({
            language: lang,
            maxResults: 1,
            partialResults: false,
            popup: true,
          })
          const text = result?.matches?.[0]?.trim()
          if (text) onText(text)
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause)
          if (!/cancel/i.test(message)) setError(message)
        } finally {
          setListening(false)
        }
      })()
      return
    }

    const Ctor = recognitionClass()
    if (!Ctor) return
    activeRef.current?.abort()

    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    let delivered = false
    recognition.onresult = (event) => {
      const transcript = Array.from(
        { length: event.results.length },
        (_, index) => event.results[index]?.[0]?.transcript ?? '',
      )
        .join(' ')
        .trim()
      if (transcript && !delivered) {
        delivered = true
        onText(transcript)
      }
    }
    recognition.onerror = (event) => {
      // "no-speech" and "aborted" are everyday events, not faults worth showing.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(event.error)
      }
    }
    recognition.onend = () => {
      setListening(false)
      activeRef.current = null
    }

    setError('')
    setListening(true)
    activeRef.current = recognition
    recognition.start()
  }, [])

  return { supported, listening, error, start, stop }
}
