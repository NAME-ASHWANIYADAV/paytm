/**
 * One language at a time, chosen once.
 *
 * The merchant picks Hindi or English on the login screen and the whole product follows —
 * chrome, numbers, dates, empty states, and the language MunshiJi replies in (every chat call
 * carries it). No dual labels, no Hinglish chrome: a real app speaks one language at a time,
 * and a shopkeeper who chose हिंदी should never have to parse an English button to get paid.
 *
 * The choice is client-held (localStorage) rather than a server setting, which is honest for a
 * single-device merchant app: the phone IS the account. Changing language signs out to the
 * login screen — one line of code, and an explicit moment instead of a live re-render surprise.
 */

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { setActiveMerchant } from './api/client'

export type Lang = 'hi' | 'en'

export interface Session {
  merchantId: string
  lang: Lang
  /** Identity captured at login, so every screen knows its shop before the first fetch. */
  shopName?: string
  ownerName?: string
  category?: string
  phone?: string
  token?: string
}

const SESSION_KEY = 'munshiji.session'

export function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Session>
    if (parsed.lang !== 'hi' && parsed.lang !== 'en') return null
    return {
      merchantId: parsed.merchantId || 'default',
      lang: parsed.lang,
      shopName: parsed.shopName,
      ownerName: parsed.ownerName,
      category: parsed.category,
      phone: parsed.phone,
      token: parsed.token,
    }
  } catch {
    return null
  }
}

function writeSession(session: Session | null): void {
  try {
    if (session === null) window.localStorage.removeItem(SESSION_KEY)
    else window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    /* private mode — the app still works, the choice just does not persist */
  }
}

/** BCP-47 tag the backend's ChatIn.language and speechSynthesis both understand. */
export function speechTag(lang: Lang): string {
  return lang === 'hi' ? 'hi-IN' : 'en-IN'
}

/* ────────────────────────────────────────────────────────────────────────────
 * Formatting. Numbers are the product; they must read like an Indian ledger
 * (₹1,23,456 grouping) in both languages, from integer paise, never floats.
 * ──────────────────────────────────────────────────────────────────────────── */

const RUPEES: Record<Lang, Intl.NumberFormat> = {
  hi: new Intl.NumberFormat('hi-IN', { maximumFractionDigits: 0 }),
  en: new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }),
}

export function formatMoney(paise: number, lang: Lang): string {
  return `₹${RUPEES[lang].format(Math.round(paise / 100))}`
}

/**
 * Drop the paise from a backend-formatted display string, for hero figures only.
 * "₹18,650.50" → "₹18,650". A headline number is read at a glance; the ledger rows and the
 * API keep every paisa.
 */
export function trimPaise(display: string): string {
  return display.replace(/\.\d{1,2}$/, '')
}

const DAY: Record<Lang, Intl.DateTimeFormat> = {
  hi: new Intl.DateTimeFormat('hi-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long' }),
  en: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }),
}

export function formatDay(iso: string, lang: Lang): string {
  const at = new Date(iso)
  return Number.isNaN(at.getTime()) ? '' : DAY[lang].format(at)
}

const CLOCK = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function formatClock(iso: string): string {
  const at = new Date(iso)
  return Number.isNaN(at.getTime()) ? '' : CLOCK.format(at)
}

/* ────────────────────────────────────────────────────────────────────────────
 * Strings. Every user-visible label in the app lives here — a Devanagari
 * character outside this table (other than data from the API) is a bug.
 * ──────────────────────────────────────────────────────────────────────────── */

const STRINGS = {
  hi: {
    // login
    'login.welcome': 'नमस्ते',
    'login.tagline': 'आपकी दुकान का AI मुंशी',
    'login.device': 'यह फ़ोन पहचाना हुआ है',
    'login.language': 'भाषा चुनें',
    'login.continue': 'आगे बढ़ें',
    'login.hindi': 'हिंदी',
    'login.english': 'English',
    'login.phone': 'फ़ोन नंबर',
    'login.phoneHint': 'जैसे 98110 34572',
    'login.password': 'पासवर्ड',
    'login.signin': 'लॉगिन करें',
    'login.signingIn': 'जाँच रहे हैं…',
    'login.wrong': 'फ़ोन नंबर या पासवर्ड ग़लत है',
    'login.offline': 'सर्वर से संपर्क नहीं हो पाया — डेमो मोड में Sharma General Store खुलेगी',
    'login.demoTitle': 'डेमो दुकानें',
    'login.demoHint': 'किसी भी दुकान पर टैप करें — नंबर-पासवर्ड अपने आप भर जाएगा',
    'login.demoOpen': 'डेमो मोड में खोलें',
    // nav
    'nav.dukaan': 'दुकान',
    'nav.munshiji': 'मुंशीजी',
    'nav.khata': 'खाता',
    // header / provider sheet
    'sheet.title': 'सिस्टम',
    'sheet.providers': 'सेवाएँ',
    'sheet.live': 'चालू',
    'sheet.local': 'लोकल',
    'sheet.sound.on': 'आवाज़ चालू है',
    'sheet.sound.off': 'आवाज़ बंद है',
    'sheet.theme.dark': 'गहरा रूप',
    'sheet.theme.light': 'हल्का रूप',
    'sheet.language': 'भाषा बदलें',
    'sheet.demo': 'डेमो डेटा',
    'sheet.retry': 'दोबारा जोड़ें',
    'sheet.close': 'बंद करें',
    // dukaan
    'dukaan.today': 'आज की वसूली',
    'dukaan.baseline': 'आम दिन से',
    'dukaan.projection': 'दिन बंद होगा',
    'dukaan.tooEarly': 'अंदाज़े के लिए अभी जल्दी है',
    'dukaan.transactions': 'बिक्री',
    'dukaan.avgTicket': 'औसत बिल',
    'dukaan.customers': 'ग्राहक',
    'dukaan.repeat': 'पुराने',
    'dukaan.new': 'नए',
    'dukaan.trend': 'पिछले 14 दिन',
    'dukaan.paymentMix': 'पैसा कैसे आया',
    'dukaan.udhaar': 'उधार बाकी',
    'dukaan.khaate': 'खाते',
    'dukaan.sujhav': 'मुंशीजी के सुझाव',
    'dukaan.sujhavEmpty': 'सब हो गया — मुंशीजी नज़र रखे है।',
    'dukaan.findings': 'दुकान की खबर',
    'dukaan.refresh': 'ताज़ा करें',
    'dukaan.refreshing': 'देख रहा हूँ…',
    'dukaan.impact': 'असर',
    // actions
    'action.pending': 'मंज़ूरी बाकी',
    'action.approve': 'हाँ, भेज दो',
    'action.approveBusy': 'भेज रहा हूँ…',
    'action.reject': 'अभी नहीं',
    'action.target': 'ग्राहक',
    'action.impact': 'अनुमानित असर',
    'action.cost': 'भेजने का खर्च',
    'action.done': 'हो चुका',
    'action.reason': 'वजह',
    'action.via': 'भेजा गया',
    'action.recovered': 'वापस आया',
    // khata
    'khata.title': 'उधार खाता',
    'khata.total': 'कुल बाकी',
    'khata.entries': 'खाते',
    'khata.aging': 'कितना पुराना',
    'khata.days': 'दिन',
    'khata.remind': 'याद दिलाओ',
    'khata.reminders': 'याद दिलाई',
    'khata.empty': 'कोई उधार बाकी नहीं — खाता साफ़ है।',
    // chat
    'chat.you': 'आप',
    'chat.munshi': 'मुंशीजी',
    'chat.placeholder': 'पूछिए — जैसे: आज कितना आया?',
    'chat.send': 'भेजो',
    'chat.micStart': 'बोलकर पूछें',
    'chat.micStop': 'रिकॉर्डिंग बंद करें',
    'chat.micMissing': 'इस ब्राउज़र में माइक नहीं है',
    'chat.listening': 'सुन रहा हूँ',
    'chat.transcribing': 'समझ रहा हूँ…',
    'chat.thinking': 'सोच रहा है',
    'chat.tools': 'काम',
    'chat.memory': 'याद से',
    'chat.view': 'देखें',
    'chat.failed': 'माफ़ कीजिए — अभी जवाब नहीं आ पाया। दोबारा पूछिए।',
    'chat.voiceFailed': 'आवाज़ समझ नहीं आई — नीचे लिखकर पूछिए।',
    'chat.pastSession': 'पिछली बात-चीत · 7 दिन पहले',
    'chat.todaySession': 'आज की बात-चीत',
    // yaad
    'yaad.title': 'याद',
    'yaad.lede': 'मुंशीजी को दुकान के बारे में जो याद है — और जवाब तक पहुँचा कैसे।',
    'yaad.live': 'Cognee ग्राफ़ · चालू',
    'yaad.local': 'लोकल ग्राफ़',
    // sparkline
    'spark.today': 'आज',
    'spark.caption': '14 दिन की वसूली · डैश = औसत',
    'spark.loading': 'डेटा आ रहा है…',
    'spark.txn': 'बिक्री',
    // misc
    'common.offline': 'ऑफ़लाइन',
    'common.loading': 'लोड हो रहा है…',
  },
  en: {
    'login.welcome': 'Welcome',
    'login.tagline': 'The AI munim for your shop',
    'login.device': 'This phone is recognised',
    'login.language': 'Choose language',
    'login.continue': 'Continue',
    'login.hindi': 'हिंदी',
    'login.english': 'English',
    'login.phone': 'Phone number',
    'login.phoneHint': 'e.g. 98110 34572',
    'login.password': 'Password',
    'login.signin': 'Sign in',
    'login.signingIn': 'Checking…',
    'login.wrong': 'Phone number or password is incorrect',
    'login.offline': 'Could not reach the server — demo mode opens Sharma General Store',
    'login.demoTitle': 'Demo shops',
    'login.demoHint': 'Tap any shop — phone and password fill in automatically',
    'login.demoOpen': 'Open in demo mode',
    'nav.dukaan': 'Shop',
    'nav.munshiji': 'MunshiJi',
    'nav.khata': 'Khata',
    'sheet.title': 'System',
    'sheet.providers': 'Services',
    'sheet.live': 'live',
    'sheet.local': 'local',
    'sheet.sound.on': 'Sound is on',
    'sheet.sound.off': 'Sound is off',
    'sheet.theme.dark': 'Dark look',
    'sheet.theme.light': 'Light look',
    'sheet.language': 'Change language',
    'sheet.demo': 'Demo data',
    'sheet.retry': 'Reconnect',
    'sheet.close': 'Close',
    'dukaan.today': "Today's collection",
    'dukaan.baseline': 'vs a usual day',
    'dukaan.projection': 'Day should close at',
    'dukaan.tooEarly': 'Too early to project',
    'dukaan.transactions': 'Sales',
    'dukaan.avgTicket': 'Avg bill',
    'dukaan.customers': 'Customers',
    'dukaan.repeat': 'Repeat',
    'dukaan.new': 'New',
    'dukaan.trend': 'Last 14 days',
    'dukaan.paymentMix': 'How money came in',
    'dukaan.udhaar': 'Udhaar open',
    'dukaan.khaate': 'accounts',
    'dukaan.sujhav': "MunshiJi's suggestions",
    'dukaan.sujhavEmpty': 'All clear — MunshiJi is keeping watch.',
    'dukaan.findings': 'Shop findings',
    'dukaan.refresh': 'Refresh',
    'dukaan.refreshing': 'Looking…',
    'dukaan.impact': 'impact',
    'action.pending': 'Needs your yes',
    'action.approve': 'Yes, send it',
    'action.approveBusy': 'Sending…',
    'action.reject': 'Not now',
    'action.target': 'customers',
    'action.impact': 'est. impact',
    'action.cost': 'cost to send',
    'action.done': 'Done',
    'action.reason': 'Reason',
    'action.via': 'sent via',
    'action.recovered': 'recovered',
    'khata.title': 'Udhaar khata',
    'khata.total': 'Total open',
    'khata.entries': 'accounts',
    'khata.aging': 'How old',
    'khata.days': 'days',
    'khata.remind': 'Remind',
    'khata.reminders': 'reminders',
    'khata.empty': 'No udhaar open — the khata is clean.',
    'chat.you': 'You',
    'chat.munshi': 'MunshiJi',
    'chat.placeholder': 'Ask — e.g. how did today go?',
    'chat.send': 'Send',
    'chat.micStart': 'Ask by voice',
    'chat.micStop': 'Stop recording',
    'chat.micMissing': 'No microphone in this browser',
    'chat.listening': 'Listening',
    'chat.transcribing': 'Transcribing…',
    'chat.thinking': 'Thinking',
    'chat.tools': 'steps',
    'chat.memory': 'from memory',
    'chat.view': 'View',
    'chat.failed': "Sorry — no answer came through. Please ask again.",
    'chat.voiceFailed': "Couldn't catch that — type it below instead.",
    'chat.pastSession': 'Earlier conversation · 7 days ago',
    'chat.todaySession': "Today's conversation",
    'yaad.title': 'Memory',
    'yaad.lede': 'What MunshiJi remembers about the shop — and how it reached the answer.',
    'yaad.live': 'Cognee graph · live',
    'yaad.local': 'Local graph',
    'spark.today': 'today',
    'spark.caption': '14-day collection · dashed = median',
    'spark.loading': 'Loading…',
    'spark.txn': 'sales',
    'common.offline': 'Offline',
    'common.loading': 'Loading…',
  },
} as const

export type StringKey = keyof (typeof STRINGS)['hi']

/** Suggestion chips under the composer — full sentences, so they live outside the flat table. */
export const SUGGESTIONS: Record<Lang, readonly string[]> = {
  hi: [
    'आज का धंधा कैसा रहा?',
    'किस-किस से कितना उधार बाकी है?',
    'पिछले ऑफर से कौन वापस आया?',
    'पुराने ग्राहक कहाँ गए?',
    'स्टॉक में क्या खत्म हो रहा है?',
  ],
  en: [
    'How did today go?',
    'Who owes me udhaar, and how much?',
    'Who came back after the last offer?',
    'Where did my regulars go?',
    'What stock is running out?',
  ],
}

/** Shop-type flavoured chips: a chemist asks about expiry, a mobile shop about dead covers. */
const CATEGORY_SUGGESTIONS: Record<string, Record<Lang, readonly string[]>> = {
  pharmacy: {
    hi: [
      'आज का धंधा कैसा रहा?',
      'कौन सी दवाइयाँ expiry के पास हैं?',
      'किस-किस से कितना उधार बाकी है?',
      'कौन से रेगुलर मरीज़ आने बंद हो गए?',
      'स्टॉक में क्या खत्म हो रहा है?',
    ],
    en: [
      'How did today go?',
      'Which medicines are close to expiry?',
      'Who owes me udhaar, and how much?',
      'Which regular patients stopped coming?',
      'What stock is running out?',
    ],
  },
  mobile: {
    hi: [
      'आज का धंधा कैसा रहा?',
      'कौन से कवर-केस पड़े-पड़े धूल खा रहे हैं?',
      'सबसे ज़्यादा मार्जिन किस चीज़ पे है?',
      'पुराने ग्राहक कहाँ गए?',
      'स्टॉक में क्या खत्म हो रहा है?',
    ],
    en: [
      'How did today go?',
      'Which covers are gathering dust on the shelf?',
      'What earns me the best margin?',
      'Where did my regulars go?',
      'What stock is running out?',
    ],
  },
}

/** The chips for this shop type — kirana (and anything unknown) gets the classic set. */
export function suggestionsFor(lang: Lang, category?: string): readonly string[] {
  if (category && CATEGORY_SUGGESTIONS[category]) return CATEGORY_SUGGESTIONS[category][lang]
  return SUGGESTIONS[lang]
}

/* ────────────────────────────────────────────────────────────────────────────
 * Context
 * ──────────────────────────────────────────────────────────────────────────── */

interface LangValue {
  session: Session | null
  lang: Lang
  t: (key: StringKey) => string
  money: (paise: number) => string
  /** Login: create the session (shop identity + language) and enter the app. */
  start: (session: Session) => void
  /** Provider sheet: back to the language choice. An explicit moment, not a live re-render. */
  signOut: () => void
}

const LangContext = createContext<LangValue | null>(null)

export function LangProvider({ children }: { children: ReactNode }): JSX.Element {
  const [session, setSession] = useState<Session | null>(() => {
    const stored = readSession()
    // Point the API client at the signed-in shop before the first fetch fires.
    setActiveMerchant(stored?.merchantId ?? null)
    return stored
  })
  const lang: Lang = session?.lang ?? 'hi'

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const start = useCallback((next: Session) => {
    setActiveMerchant(next.merchantId)
    writeSession(next)
    setSession(next)
  }, [])

  const signOut = useCallback(() => {
    setActiveMerchant(null)
    writeSession(null)
    setSession(null)
  }, [])

  const t = useCallback((key: StringKey) => STRINGS[lang][key], [lang])
  const money = useCallback((paise: number) => formatMoney(paise, lang), [lang])

  const value = useMemo<LangValue>(
    () => ({ session, lang, t, money, start, signOut }),
    [session, lang, t, money, start, signOut],
  )

  return createElement(LangContext.Provider, { value }, children)
}

export function useLang(): LangValue {
  const value = useContext(LangContext)
  if (!value) throw new Error('useLang must be used inside <LangProvider>')
  return value
}
