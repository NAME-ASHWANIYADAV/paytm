import { useEffect, useRef, useState, type FormEvent } from 'react'

import { getShops, loginApi, MERCHANT_ID } from '../api/client'
import type { ShopCard } from '../api/types'
import { LogoMark } from '../components/Logo'
import { useLang, type Lang } from '../i18n'

/**
 * A real sign-in: phone + password, verified by the backend against seeded accounts (salted
 * hash, 401 on mismatch). The demo-shops strip below the form is the honest version of demo
 * convenience — tap a shop and the real credentials fill in; the submit still goes through the
 * real check. No fake OTP theatre, and no pretending: the password is printed because these
 * are demo shops, not because passwords do not matter.
 *
 * Offline stays a first-class path. If the API is unreachable the same screen offers the
 * demo-mode door into the fixture shop, labelled as exactly that.
 */

const SHOP_ICONS: Record<string, string> = { kirana: '🛒', pharmacy: '💊', mobile: '📱' }

function prettyPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(-10)
  return digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : raw
}

export function LoginPage(): JSX.Element {
  const { t, start } = useLang()
  const [lang, setLang] = useState<Lang>('hi')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<'' | 'wrong' | 'offline'>('')
  const [shops, setShops] = useState<ShopCard[]>([])
  const [demoPassword, setDemoPassword] = useState('munshi123')
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    void getShops().then(({ data }) => {
      if (!alive) return
      setShops(data.shops)
      if (data.demo_password) setDemoPassword(data.demo_password)
    })
    return () => {
      alive = false
    }
  }, [])

  const fill = (shop: ShopCard): void => {
    setPhone(prettyPhone(shop.phone))
    setPassword(demoPassword)
    setError('')
    passwordRef.current?.focus()
  }

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    if (busy || !phone.trim() || !password) return
    setBusy(true)
    setError('')
    const result = await loginApi(phone.trim(), password)
    setBusy(false)
    if (result.outcome === 'ok') {
      const merchant = result.data.merchant
      start({
        merchantId: merchant.id,
        lang,
        shopName: merchant.shop_name,
        ownerName: merchant.owner_name,
        category: merchant.category,
        phone: merchant.phone,
        token: result.data.token,
      })
      return
    }
    setError(result.outcome === 'invalid' ? 'wrong' : 'offline')
  }

  const enterDemo = (): void => {
    start({
      merchantId: MERCHANT_ID,
      lang,
      shopName: 'Sharma General Store',
      ownerName: 'Rajesh Sharma',
      category: 'kirana',
    })
  }

  return (
    <main className="login">
      <div className="login__top">
        <div className="login__mark" aria-hidden="true">
          <LogoMark size={64} />
        </div>
        <h1 className="login__name">MunshiJi</h1>
        <p className="login__tagline">{t('login.tagline')}</p>
      </div>

      <form className="login__card" onSubmit={(event) => void submit(event)}>
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

        <label className="login__label" htmlFor="login-phone">
          {t('login.phone')}
        </label>
        <div className="field">
          <span className="field__prefix">+91</span>
          <input
            id="login-phone"
            className="field__input"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder={t('login.phoneHint')}
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value)
              if (error) setError('')
            }}
          />
        </div>

        <label className="login__label" htmlFor="login-password">
          {t('login.password')}
        </label>
        <div className="field">
          <input
            id="login-password"
            ref={passwordRef}
            className="field__input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              if (error) setError('')
            }}
          />
        </div>

        {error === 'wrong' && (
          <p className="login__error" role="alert">
            {t('login.wrong')}
          </p>
        )}
        {error === 'offline' && (
          <div className="login__offline" role="alert">
            <p>{t('login.offline')}</p>
            <button type="button" className="btn btn--ghost" onClick={enterDemo}>
              {t('login.demoOpen')}
            </button>
          </div>
        )}

        <button
          type="submit"
          className="btn btn--primary login__go"
          disabled={busy || !phone.trim() || !password}
        >
          {busy ? t('login.signingIn') : t('login.signin')}
        </button>
      </form>

      {shops.length > 0 && (
        <section className="login__demo" aria-label={t('login.demoTitle')}>
          <div className="login__demohead">
            <span className="login__demotitle">{t('login.demoTitle')}</span>
            <span className="login__demopass">
              password: <b>{demoPassword}</b>
            </span>
          </div>
          <p className="login__demohint">{t('login.demoHint')}</p>
          <div className="login__shops">
            {shops.map((shop) => (
              <button
                key={shop.shop_name}
                type="button"
                className="shopcard"
                onClick={() => fill(shop)}
              >
                <span className="shopcard__icon" aria-hidden="true">
                  {SHOP_ICONS[shop.category] ?? '🏬'}
                </span>
                <span className="shopcard__body">
                  <b>{shop.shop_name}</b>
                  <small>
                    {shop.owner_name} · {shop.locality}
                  </small>
                  <small className="shopcard__phone">{prettyPhone(shop.phone)}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="login__foot">Sarvam · Cognee · n8n</p>
    </main>
  )
}
