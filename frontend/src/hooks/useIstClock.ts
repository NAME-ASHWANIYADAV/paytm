import { useEffect, useState } from 'react'

const TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const DATE = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export interface IstClock {
  time: string
  date: string
}

/** Wall clock in Asia/Kolkata — the only time zone this product recognises (SPEC §2.3). */
export function useIstClock(): IstClock {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return { time: TIME.format(now), date: DATE.format(now) }
}
