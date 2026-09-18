/**
 * Speaking MunshiJi's reply.
 *
 * Two paths, chosen by the server:
 *   • `client_should_synthesise: true` → `window.speechSynthesis`, preferring a voice that
 *     matches the REQUESTED language — a merchant who chose English must not hear the reply
 *     through a Hindi voice, and vice versa.
 *   • otherwise → play `audio_data_uri` (Sarvam bulbul output) through an <audio> element.
 */

const cachedVoice = new Map<string, SpeechSynthesisVoice | null>()
let activeAudio: HTMLAudioElement | null = null

function normalise(tag: string): string {
  return tag.toLowerCase().replace('_', '-')
}

/** Rank a system voice for the requested language; the requested family always wins. */
function scoreVoice(voice: SpeechSynthesisVoice, wanted: string): number {
  const lang = normalise(voice.lang)
  const family = wanted.split('-')[0]
  if (lang === wanted) return 4
  if (lang.startsWith(family)) return 3
  // Cross-language fallbacks: an Indian-English voice reads Hindi names least badly,
  // and a Hindi voice reads Hinglish better than en-US does.
  if (lang === 'en-in' || lang.startsWith('hi')) return 2
  if (lang.startsWith('en')) return 1
  return 0
}

/** Best available voice for `language`, or null while the voice list is still loading. */
export function pickVoice(language = 'hi-IN'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const wanted = normalise(language)
  if (cachedVoice.has(wanted)) return cachedVoice.get(wanted) ?? null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const best = voices.reduce((left, right) =>
    scoreVoice(right, wanted) > scoreVoice(left, wanted) ? right : left,
  )
  const chosen = scoreVoice(best, wanted) > 0 ? best : voices[0] ?? null
  cachedVoice.set(wanted, chosen)
  return chosen
}

/** Name of the voice we would use, for the UI ("bolega: Microsoft Swara"). */
export function voiceLabel(language = 'hi-IN'): string {
  const voice = pickVoice(language)
  return voice ? `${voice.name} · ${voice.lang}` : 'system voice'
}

export function primeVoices(): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return () => {}
  const refresh = (): void => {
    cachedVoice.clear()
    pickVoice('hi-IN')
    pickVoice('en-IN')
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
  const voice = pickVoice(language)
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
