import { ActionQueue } from '../components/ActionQueue'
import { useApp } from '../state/store'

interface Refusal {
  name: string
  rule: string
  reason_en: string
}

/** Pull the compliance refusals out of whatever actions carry them. */
function refusalsFrom(result: Record<string, unknown>): Refusal[] {
  const compliance = result.compliance
  if (typeof compliance !== 'object' || compliance === null) return []
  const list = (compliance as { refusals?: unknown }).refusals
  if (!Array.isArray(list)) return []
  return list.filter(
    (entry): entry is Refusal =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as Refusal).name === 'string' &&
      typeof (entry as Refusal).rule === 'string',
  )
}

const RULE_LABEL: Record<string, string> = {
  no_marketing_consent: 'no marketing consent on file',
  opted_out: 'asked not to be contacted',
}

/**
 * What MunshiJi did, and what it declined to do.
 *
 * The refusals are the part no other view has ever shown. A guardrail nobody can see is
 * decoration, so every recipient that was dropped is named here with the rule that dropped them.
 */
export function ActionsPage(): JSX.Element {
  const { actions } = useApp()
  const refused = (actions?.actions ?? []).flatMap((action) =>
    refusalsFrom(action.result).map((refusal) => ({ ...refusal, actionId: action.id })),
  )

  return (
    <main className="page">
      <header className="page__head">
        <h1 className="page__title deva" lang="hi">
          काम
        </h1>
        <p className="page__lede">
          Nothing leaves without the merchant saying yes, and every send carries what it costs
          alongside what it is expected to bring back.
        </p>
      </header>

      <div className="page__body">
        <ActionQueue variant="page" />

        <section className="refusals">
          <h2 className="refusals__title">
            Not contacted
            <span className="refusals__count tabular">{refused.length}</span>
          </h2>
          <p className="refusals__lede">
            An offer is a marketing message and needs consent the customer actually gave. A
            reminder about someone's own outstanding balance does not — but an opt-out stops both.
          </p>
          {refused.length === 0 ? (
            <p className="empty">Nobody has been dropped from a send yet.</p>
          ) : (
            <ul className="refusals__list">
              {refused.map((refusal, index) => (
                <li className="refusal" key={`${refusal.actionId}-${index}`}>
                  <b>{refusal.name}</b>
                  <span className="refusal__rule">
                    {RULE_LABEL[refusal.rule] ?? refusal.rule.replace(/_/g, ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
