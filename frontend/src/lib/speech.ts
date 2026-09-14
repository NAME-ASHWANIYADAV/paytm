/**
 * Speaking MunshiJi's reply.
 *
 * Two paths, chosen by the server:
 *   • `client_should_synthesise: true` → `window.speechSynthesis`, preferring a Hindi voice
 *     (hi-IN), then an Indian-English one, then whatever the machine has.
 *   • otherwise → play `audio_data_uri` (Sarvam bulbul output) through an <audio> element.
 */

let cachedVoice: SpeechSynthesisVoice | null = null
let activeAudio: HTMLAudioElement | null = null

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang.toLowerCase().replace('_', '-')
  if (lang.startsWith('hi')) return 3
  if (lang === 'en-in') return 2
  if (lang.startsWith('en')) return 1
  return 0
}

/** Best available voice for Hinglish output, or null while the voice list is still loading. */
export function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  if (cachedVoice) return cachedVoice
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const best = voices.reduce((left, right) => (scoreVoice(right) > scoreVoice(left) ? right : left))
  cachedVoice = scoreVoice(best) > 0 ? best : voices[0] ?? null
  return cachedVoice
}

/** Name of the voice we would use, for the UI ("bolega: Microsoft Swara"). */
export function voiceLabel(): string {
  const voice = pickVoice()
  return voice ? `${voice.name} · ${voice.lang}` : 'system voice'
}

export function primeVoices(): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return () => {}
  const refresh = (): void => {
    cachedVoice = null
    pickVoice()
  }
  refresh()
  window.speechSynthesis.addEventListener('voiceschanged', refresh)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh)
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
  if (activeAudio) {
    activeAudio.pause()
    activeAudio.currentTime = 0
    activeAudio = null
  }
}

export function speakText(text: string, language = 'hi-IN'): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickVoice()
  if (voice) utterance.voice = voice
  utterance.lang = voice?.lang ?? language
  utterance.rate = 0.98
  utterance.pitch = 1
  window.speechSynthesis.speak(utterance)
}

export function playDataUri(uri: string): void {
  stopSpeaking()
  const audio = new Audio(uri)
  activeAudio = audio
  void audio.play().catch(() => {
    // Autoplay blocked before the first user gesture — the mic/send click satisfies it in practice.
    activeAudio = null
  })
}
