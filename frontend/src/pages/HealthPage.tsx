import { DimensionBar } from '../components/DimensionBar'
import { ChainLink } from '../components/Chain'
import { HealthDial } from '../components/HealthDial'
import { useApp } from '../state/store'

/**
 * The lender-facing read of the same engines that advise the merchant.
 *
 * Paytm does not make its money selling dashboards to kirana owners; it makes it on payments,
 * subscriptions and distributing credit. The hardest part of lending to a shop with no audited
 * accounts is knowing whether it is a good shop — and a merchant who talks to MunshiJi every day
 * is producing exactly that evidence, as a by-product.
 */
export function HealthPage(): JSX.Element {
  const { merchantHealth } = useApp()

  return (
    <main className="page">
      <header className="page__head">
        <h1 className="page__title deva" lang="hi">
          सेहत
        </h1>
        <p className="page__lede">
          How the shop looks to someone deciding whether to lend to it, built from the same engines
          that advise the merchant.
        </p>
      </header>

      <div className="page__body">
        {merchantHealth === null ? (
          <p className="empty">Working out the shop's health…</p>
        ) : (
          <div className="health">
            <HealthDial health={merchantHealth} />
            <div className="health__dims">
              <ChainLink direction="to" to="/salah" kind="salah">
                what would move the weakest of these
              </ChainLink>
              {merchantHealth.dimensions.map((dimension) => (
                <DimensionBar
                  key={dimension.key}
                  dimension={dimension}
                  weakest={dimension.key === merchantHealth.weakest_dimension}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
