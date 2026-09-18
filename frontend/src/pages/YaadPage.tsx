import { MemoryGraph } from '../components/MemoryGraph'
import { useLang } from '../i18n'
import { useApp } from '../state/store'

/**
 * The knowledge graph — reached from a memory chip in the conversation, not from the nav.
 * It is an explanation, not a daily page: the merchant taps "याद से" under an answer and sees
 * where the answer came from. The badge is honest by construction — it reports which provider
 * actually served this snapshot, never which one we hoped would.
 */
export function YaadPage(): JSX.Element {
  const { t, lang } = useLang()
  const { graph } = useApp()

  const live = graph?.meta.provider === 'live'

  return (
    <main className="page page--yaad">
      <header className="yaad__head">
        <h1 className={lang === 'hi' ? 'deva' : ''}>{t('yaad.title')}</h1>
        <span className={`chip ${live ? 'chip--live' : 'chip--local'}`}>
          {live ? t('yaad.live') : t('yaad.local')}
        </span>
      </header>
      <p className={`yaad__lede${lang === 'hi' ? ' deva' : ''}`}>{t('yaad.lede')}</p>
      <div className="yaad__graph">
        <MemoryGraph variant="page" />
      </div>
    </main>
  )
}
