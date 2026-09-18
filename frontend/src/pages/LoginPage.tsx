import { useState } from 'react'

import { useLang, type Lang } from '../i18n'

/**
 * Presentation-honest entry. No fake OTP theatre — a judge who types a random code into a
 * pretend verification field has caught you performing security. "This phone is recognised"
 * is what a returning merchant's real login looks like, and it is true of the demo device.
 *
 * The one decision that belongs to this screen is language, because everything after it —
 * chrome, replies, the spoken voice — follows that choice.
 */

// The seeded shop. Static on purpose: nothing is fetched before the merchant has chosen a
// language, so the first screen costs nothing and cannot fail offline.
const SHOP = { name: 'Sharma General Store', phone: '+91 98··· ···41' }

export function LoginPage(): JSX.Element {
  const { t, start } = useLang()
  const [lang, setLang] = useState<Lang>('hi')

  return (
    <main className="login">
      <div className="login__top">
        <div className="login__mark deva" aria-hidden="true">
          मु
        </div>
        <h1 className="login__name">MunshiJi</h1>
        <p className="login__tagline">{t('login.tagline')}</p>
      </div>

      <div className="login__card">
        <div className="login__shop">
          <span className="statusdot statusdot--live" aria-hidden="true" />
          <span>
            <b>{SHOP.name}</b>
            <small>
              {SHOP.phone} · {t('login.device')}
            </small>
          </span>
        </div>

        <div className="login__label" id="lang-label">
          {t('login.language')}
        </div>
        <div className="login__langs" role="radiogroup" aria-labelledby="lang-label">
          <button
            type="button"
            role="radio"
            aria-checked={lang === 'hi'}
            className={`langcard deva${lang === 'hi' ? ' langcard--on' : ''}`}
            onClick={() => setLang('hi')}
          >
            हिंदी
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lang === 'en'}
            className={`langcard${lang === 'en' ? ' langcard--on' : ''}`}
            onClick={() => setLang('en')}
          >
            English
          </button>
        </div>

        <button type="button" className="btn btn--primary login__go" onClick={() => start(lang)}>
          {lang === 'hi' ? 'आगे बढ़ें' : 'Continue'}
        </button>
      </div>

      <p className="login__foot">Sarvam · Cognee · n8n</p>
    </main>
  )
}
