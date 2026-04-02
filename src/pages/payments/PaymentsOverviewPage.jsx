import { paymentStatusLabel } from '../../constants/paymentEnums'
import { formatAdminDateTime } from '../../utils/format'
import { usePaymentsAdmin } from './PaymentsAdminContext'
import {
  C,
  formatCurrency,
  formatFeePercentOfCollected,
  StatCard,
  TrendChart,
} from './paymentsShared'

const PAYMENT_STATUS_KEYS = [
  'captured',
  'pending',
  'initiated',
  'failed',
  'refunded',
  'underpaid',
  'expired',
]

const STATUS_BAR_COLOR = {
  captured: C.success,
  pending: C.warning,
  initiated: C.info,
  failed: C.danger,
  refunded: C.primary,
  underpaid: '#b45309',
  expired: C.secondary,
}

function sumStatusCounts(s, loading) {
  if (loading || !s?.paymentStatus) return 0
  return PAYMENT_STATUS_KEYS.reduce((acc, k) => acc + (Number(s.paymentStatus[k]) || 0), 0)
}

function StatusDistributionRow({ statusKey, count, total, loading }) {
  const n = loading ? null : Number(count) || 0
  const pct = !loading && total > 0 ? Math.min(100, Math.round((n / total) * 100)) : 0
  const label = paymentStatusLabel(statusKey)
  const barColor = STATUS_BAR_COLOR[statusKey] || C.secondary

  return (
    <div className="payments-status-board__row">
      <div className="payments-status-board__row-main">
        <span className="payments-status-board__name">{label}</span>
        <span className="payments-status-board__count">
          {loading ? '…' : n.toLocaleString('en-IN')}
        </span>
      </div>
      <div className="payments-status-board__track" aria-hidden={loading}>
        <div
          className="payments-status-board__fill"
          style={{
            width: loading ? '0%' : `${pct}%`,
            background: barColor,
          }}
        />
      </div>
      <span className="payments-status-board__pct">
        {loading || !total ? '—' : `${pct}%`}
      </span>
    </div>
  )
}

export default function PaymentsOverviewPage() {
  const { stats: s, statsLoading, fetchStats } = usePaymentsAdmin()

  const statusTotal = sumStatusCounts(s, statsLoading)
  const onlineCount = statsLoading ? null : Number(s?.paymentTypeSplit?.online?.count) || 0
  const cashCount = statsLoading ? null : Number(s?.paymentTypeSplit?.cash?.count) || 0
  const channelTotal = statsLoading ? 0 : onlineCount + cashCount
  const onlinePct = !statsLoading && channelTotal > 0 ? Math.round((onlineCount / channelTotal) * 100) : 0
  const cashPct = !statsLoading && channelTotal > 0 ? Math.round((cashCount / channelTotal) * 100) : 0

  return (
    <div className="payments-overview">
      <header className="payments-overview__header">
        <div>
          <h1 className="payments-overview__title">Overview</h1>
          <p className="payments-overview__lede">
            Capture trend, balances, and how payments break down by status and channel (online vs cash).
          </p>
        </div>
        <button
          type="button"
          className="payments-overview__refresh"
          onClick={fetchStats}
          disabled={statsLoading}
        >
          {statsLoading ? '↻ Updating…' : '↻ Refresh data'}
        </button>
      </header>

      <section className="payments-overview__chart payments-page__card">
        <div className="payments-overview__chart-head">
          <h2 className="payments-overview__section-title">Captured volume — last 7 days (IST)</h2>
          <p className="payments-overview__hint">
            Bars show the day each payment reached <strong>captured</strong> (verified), not when the order was created.
          </p>
        </div>
        {statsLoading ? (
          <p className="payments-overview__loading">Loading chart…</p>
        ) : (
          <TrendChart data={s?.dailyTrend} totals={s?.dailyTrendTotals} />
        )}
        {!statsLoading && s?.generatedAt && (
          <p className="payments-overview__meta">
            Live snapshot · {formatAdminDateTime(s.generatedAt)}
          </p>
        )}
      </section>

      <section className="payments-page__card">
        <h2 className="payments-overview__section-title">Money overview</h2>
        <p className="payments-overview__hint payments-overview__hint--tight">
          High-level balances from the same snapshot as the chart above.
        </p>
        <div className="payments-overview__stat-grid">
          <StatCard
            label="Total collected"
            value={statsLoading ? '…' : formatCurrency(s?.revenue?.totalCollected)}
            sub={statsLoading ? undefined : `${(s?.revenue?.capturedPaymentRows ?? 0).toLocaleString('en-IN')} captured row(s)`}
            accentColor={C.success}
            icon="💸"
          />
          <StatCard
            label="Disbursed to banks"
            value={statsLoading ? '…' : formatCurrency(s?.revenue?.disbursedToBank)}
            sub={statsLoading ? undefined : `${(s?.revenue?.disbursedPayoutTransferCount ?? 0).toLocaleString('en-IN')} transfers`}
            accentColor="#10b981"
            icon="🏦"
          />
          <StatCard
            label="Platform revenue"
            value={statsLoading ? '…' : formatCurrency(s?.revenue?.platformFeeEarned)}
            sub={statsLoading ? undefined : (() => {
              const p = formatFeePercentOfCollected(s?.revenue?.platformFeePercentOfCollected)
              return p ? `${p}` : 'Σ platformFee on captured rows'
            })()}
            accentColor={C.primary}
            icon="🏛"
          />
          <StatCard
            label="In worker wallets"
            value={statsLoading ? '…' : formatCurrency(s?.revenue?.pendingInWallets)}
            sub={statsLoading ? undefined : 'After ledger adjustments'}
            accentColor={C.info}
            icon="👛"
          />
          <StatCard
            label="Pending payouts"
            value={statsLoading ? '…' : `${(s?.payoutStatus?.pendingAll ?? 0).toLocaleString('en-IN')} queued`}
            sub={statsLoading ? undefined : 'pending + on_hold (captured)'}
            accentColor={C.warning}
            icon="⏳"
          />
        </div>
      </section>

      <section className="payments-page__card payments-status-board">
        <h2 className="payments-overview__section-title">Payment statuses &amp; channels</h2>
        <p className="payments-overview__hint payments-overview__hint--tight">
          Row length shows each status’s share of all payments in these categories. Below that, online vs cash uses the same style for quick comparison.
        </p>

        <h3 className="payments-status-board__subtitle">By status</h3>
        <div className="payments-status-board__rows">
          {PAYMENT_STATUS_KEYS.map((key) => (
            <StatusDistributionRow
              key={key}
              statusKey={key}
              count={s?.paymentStatus?.[key]}
              total={statusTotal}
              loading={statsLoading}
            />
          ))}
        </div>

        <h3 className="payments-status-board__subtitle payments-status-board__subtitle--channels">By payment channel</h3>
        <div className="payments-status-board__rows">
          <div className="payments-status-board__row">
            <div className="payments-status-board__row-main">
              <span className="payments-status-board__name">Online (Razorpay)</span>
              <span className="payments-status-board__count">
                {statsLoading ? '…' : (
                  <>
                    {onlineCount.toLocaleString('en-IN')}
                    <span className="payments-status-board__amount">
                      {' · '}
                      {formatCurrency(s?.paymentTypeSplit?.online?.total)}
                    </span>
                  </>
                )}
              </span>
            </div>
            <div className="payments-status-board__track">
              <div
                className="payments-status-board__fill"
                style={{
                  width: statsLoading || !channelTotal ? '0%' : `${onlinePct}%`,
                  background: C.info,
                }}
              />
            </div>
            <span className="payments-status-board__pct">
              {statsLoading || !channelTotal ? '—' : `${onlinePct}%`}
            </span>
          </div>
          <div className="payments-status-board__row">
            <div className="payments-status-board__row-main">
              <span className="payments-status-board__name">Cash</span>
              <span className="payments-status-board__count">
                {statsLoading ? '…' : (
                  <>
                    {cashCount.toLocaleString('en-IN')}
                    <span className="payments-status-board__amount">
                      {' · '}
                      {formatCurrency(s?.paymentTypeSplit?.cash?.total)}
                    </span>
                  </>
                )}
              </span>
            </div>
            <div className="payments-status-board__track">
              <div
                className="payments-status-board__fill"
                style={{
                  width: statsLoading || !channelTotal ? '0%' : `${cashPct}%`,
                  background: C.warning,
                }}
              />
            </div>
            <span className="payments-status-board__pct">
              {statsLoading || !channelTotal ? '—' : `${cashPct}%`}
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
