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

  const supported = recognitionClass() !== null

  useEffect(
    () => () => {
      activeRef.current?.abort()
      activeRef.current = null
    },
    [],
  )

  const stop = useCallback(() => {
    // stop() (not abort): lets a final result that is already in flight still arrive.
    activeRef.current?.stop()
  }, [])

  const start = useCallback((lang: string, onText: (text: string) => void) => {
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
