import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Avatar } from '../../components/ui'
import { formatAdminDateTime } from '../../utils/format'
import { paymentApi } from '../../services/api'
import { usePaymentsAdmin } from './PaymentsAdminContext'
import { formatPaymentDisplayId, formatCurrencyTable } from './paymentsShared'
import './paymentsHubV2.css'

/** Next :00 or :30 boundary in Asia/Kolkata after `from` (for “next retry window” hint). */
function nextISTHalfHourAfter(from = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(from)
  const g = (t) => +parts.find((x) => x.type === t).value
  const hour = g('hour')
  const min = g('minute')
  const sec = g('second')
  const totalSec = hour * 3600 + min * 60 + sec
  const pos = totalSec % 1800
  const addSec = pos === 0 ? 1800 : 1800 - pos
  return new Date(from.getTime() + addSec * 1000)
}

function employerNameFromPayment(p) {
  const emp = p?.jobId?.employerId
  if (emp && typeof emp === 'object') return emp.businessName || emp.companyName || '—'
  return '—'
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function IconXCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5" />
      <path d="M15 9l-6 6M9 9l6 6" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconCheckCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5" />
      <path d="M8 12.5l2.5 2.5 5-6" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconHealthy() {
  return (
    <svg className="ph2-cron-banner__check" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#dcfce7" stroke="#22c55e" strokeWidth="1.5" />
      <path d="M8 12l2.5 2.5L16 9" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconSync() {
  return (
    <svg
      className="ph2-retry-all-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  )
}

export default function PaymentsPayoutsPage() {
  const {
    stats: s,
    statsLoading,
    fetchStats,
    triggerLoading,
    retryFailedLoading,
    handleTriggerPayouts,
    handleRetryFailedPayoutsBatch,
    handleRetryOnePayout,
    retryingPaymentId,
  } = usePaymentsAdmin()

  const [failedRows, setFailedRows] = useState([])
  const [failedLoading, setFailedLoading] = useState(true)

  const maxRetries = s?.retryHealth?.maxAutoRetries ?? 3
  const retriable = s?.retryHealth?.retriableFailedCount ?? 0
  const pendingAll = s?.payoutStatus?.pendingAll ?? 0
  const failedAll = s?.payoutStatus?.failed ?? 0
  const sn = s?.adminSnapshot
  const processedToday = sn?.payoutRowsMarkedPaidToday ?? 0
  const healthy = retriable === 0

  const cronRows = Array.isArray(s?.cronSchedule) ? s.cronSchedule : []
  const retryCron = cronRows.find((r) => r.id === 'payout_retry')

  const nextScheduled = useMemo(() => {
    if (!retryCron?.cron) return null
    return nextISTHalfHourAfter(new Date())
  }, [retryCron?.cron, s?.generatedAt])

  useEffect(() => {
    if (statsLoading) return
    let cancelled = false
    setFailedLoading(true)
    paymentApi
      .listAdminAll({
        page: 1,
        limit: 50,
        status: 'captured',
        payoutStatus: 'failed',
        paymentType: 'ONLINE',
      })
      .then((res) => {
        if (!cancelled) setFailedRows(Array.isArray(res?.data) ? res.data : [])
      })
      .catch(() => {
        if (!cancelled) setFailedRows([])
      })
      .finally(() => {
        if (!cancelled) setFailedLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [statsLoading, s?.generatedAt])

  const lastRunDisplay = s?.generatedAt ? formatAdminDateTime(s.generatedAt) : '—'
  const nextScheduledDisplay =
    nextScheduled && retryCron ? formatAdminDateTime(nextScheduled) : retryCron?.schedule || '—'

  return (
    <div className="ph2-page payments-cron-v2">
      <header className="ph2-hero">
        <h1 className="ph2-title">Cron &amp; Payouts Management</h1>
        <p className="ph2-sub">Monitor and control automated payout processing — Indore, MP</p>
      </header>

      <section
        className={`ph2-cron-banner${healthy ? ' ph2-cron-banner--healthy' : ' ph2-cron-banner--warn'}`}
        aria-label="Payout cron health"
      >
        <div className="ph2-cron-banner__row">
          <div className="ph2-cron-banner__intro">
            {healthy ? <IconHealthy /> : <span className="ph2-cron-banner__warn-emoji" aria-hidden>⚠️</span>}
            <div>
              <h2 className="ph2-cron-banner__title">
                {healthy ? 'Payout Cron is Healthy' : 'Attention: failed payouts in retry queue'}
              </h2>
              <p className="ph2-cron-banner__lede">
                {healthy
                  ? 'Automated payouts are running on schedule without issues'
                  : `${retriable.toLocaleString('en-IN')} online payout(s) can be retried (max ${maxRetries} attempts each).`}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ph2-cron-toggle-btn"
            onClick={() => fetchStats()}
            disabled={statsLoading}
            title="Reload cron metrics from the server"
          >
            {statsLoading ? '…' : 'Toggle status'}
          </button>
        </div>

        <div className="ph2-cron-banner__metrics">
          <div className="ph2-cron-metric">
            <span className="ph2-cron-metric__label">Last run</span>
            <strong className="ph2-cron-metric__value">{statsLoading ? '…' : lastRunDisplay}</strong>
            <span className="ph2-cron-metric__hint">Dashboard snapshot</span>
          </div>
          <div className="ph2-cron-metric">
            <span className="ph2-cron-metric__label">Next scheduled</span>
            <strong className="ph2-cron-metric__value">{statsLoading ? '…' : nextScheduledDisplay}</strong>
            <span className="ph2-cron-metric__hint">
              {retryCron ? `${retryCron.schedule}${retryCron.cron ? ' (IST window est.)' : ''}` : '—'}
            </span>
          </div>
          <div className="ph2-cron-metric">
            <span className="ph2-cron-metric__label">Status</span>
            <strong className="ph2-cron-metric__value ph2-cron-metric__value--ok">ACTIVE</strong>
          </div>
        </div>
      </section>

      <section className="ph2-payout-kpi-row" aria-label="Payout queue summary">
        <article className="ph2-payout-kpi">
          <div className="ph2-payout-kpi-icon ph2-payout-kpi-icon--clock" aria-hidden>
            <IconClock />
          </div>
          <p className="ph2-payout-kpi-label">Pending Queue</p>
          <p className="ph2-payout-kpi-value">{statsLoading ? '…' : pendingAll.toLocaleString('en-IN')}</p>
          <p className="ph2-payout-kpi-foot">Waiting for next cron run</p>
        </article>
        <article className="ph2-payout-kpi">
          <div className="ph2-payout-kpi-icon ph2-payout-kpi-icon--fail" aria-hidden>
            <IconXCircle />
          </div>
          <p className="ph2-payout-kpi-label">Failed Queue</p>
          <p className="ph2-payout-kpi-value">{statsLoading ? '…' : failedAll.toLocaleString('en-IN')}</p>
          <p className="ph2-payout-kpi-foot">Requires manual retry</p>
        </article>
        <article className="ph2-payout-kpi">
          <div className="ph2-payout-kpi-icon ph2-payout-kpi-icon--ok" aria-hidden>
            <IconCheckCircle />
          </div>
          <p className="ph2-payout-kpi-label">Processed Today</p>
          <p className="ph2-payout-kpi-value">{statsLoading ? '…' : processedToday.toLocaleString('en-IN')}</p>
          <p className="ph2-payout-kpi-foot">Successfully completed</p>
        </article>
      </section>

      <section className="ph2-failed-queue">
        <div className="ph2-failed-queue__head">
          <div>
            <h2 className="ph2-failed-queue__title">Failed Payout Queue</h2>
            <p className="ph2-failed-queue__sub">Razorpay payout failures requiring manual review and retry</p>
          </div>
          <button
            type="button"
            className="ph2-btn-retry-all"
            onClick={handleRetryFailedPayoutsBatch}
            disabled={retryFailedLoading || triggerLoading || !(retriable > 0)}
          >
            <IconSync />
            {retryFailedLoading ? 'Retrying…' : 'Retry All Failed'}
          </button>
        </div>

        <div className="ph2-failed-queue__table-wrap">
          <table className="ph2-table ph2-table--cron ph2-failed-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Worker</th>
                <th>Amount</th>
                <th>Razorpay error</th>
                <th>Employer</th>
                <th>Failed at</th>
                <th>Retries</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {failedLoading && (
                <tr>
                  <td colSpan={8} className="ph2-muted" style={{ padding: 16 }}>
                    Loading failed payouts…
                  </td>
                </tr>
              )}
              {!failedLoading && failedRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="ph2-muted" style={{ padding: 16 }}>
                    No failed ONLINE payouts in the first 50 rows.
                  </td>
                </tr>
              )}
              {failedRows.map((p) => (
                <tr key={p._id}>
                  <td>
                    <NavLink to={`/payments/transactions/${p._id}`} className="ph2-id-link">
                      {formatPaymentDisplayId(p)}
                    </NavLink>
                  </td>
                  <td>
                    <div className="ph2-cell-user">
                      <Avatar nameOrEmail={p.workerId?.fullName} />
                      <span className="ph2-cell-name">{p.workerId?.fullName || '—'}</span>
                    </div>
                  </td>
                  <td className="ph2-amt">{formatCurrencyTable(p.workerAmount)}</td>
                  <td className="ph2-err-cell">
                    <span className="ph2-err-cell__glyph" aria-hidden>
                      ✕
                    </span>
                    <span className="ph2-err-cell__text">{p.payoutFailureReason || '—'}</span>
                  </td>
                  <td className="ph2-cell-name">{employerNameFromPayment(p)}</td>
                  <td className="ph2-muted" style={{ whiteSpace: 'nowrap' }}>
                    {p.updatedAt ? formatAdminDateTime(p.updatedAt) : '—'}
                  </td>
                  <td>
                    <span className="ph2-retry-badge">{Number(p.payoutRetryCount) || 0}x</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ph2-btn-retry-now"
                      disabled={retryingPaymentId === p._id || retryFailedLoading}
                      onClick={() => handleRetryOnePayout(p._id)}
                    >
                      {retryingPaymentId === p._id ? '…' : 'Retry Now'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <details className="ph2-cron-schedules-details">
        <summary>Server schedules (reference)</summary>
        <p className="ph2-muted" style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem' }}>
          Same source as <code>paymentCronSchedule</code> on the API.
        </p>
        {cronRows.length === 0 ? (
          <p className="ph2-muted">No schedule data.</p>
        ) : (
          <ol className="ph2-cron-schedules-list">
            {cronRows.map((row) => (
              <li key={row.id}>
                <strong>{row.name}</strong> — {row.schedule}
                {row.cron && <code className="ph2-cron-code">{row.cron}</code>}
              </li>
            ))}
          </ol>
        )}
      </details>

      <section className="ph2-danger-zone" aria-label="Manual payout trigger">
        <div className="ph2-danger-zone__title">
          <span className="ph2-danger-zone__warn-icon" aria-hidden>
            ▲
          </span>
          <h3>Danger Zone</h3>
        </div>
        <div className="ph2-danger-zone__split">
          <div className="ph2-danger-zone__copy">
            <h4>Manual Payout Trigger</h4>
            <p>
              Immediately trigger the payout cron to process all pending payouts. Use this only if the scheduled cron
              has failed or urgent payouts need to be processed.
            </p>
            <p className="ph2-danger-zone__warn-line">
              <span aria-hidden>⚠️</span> This will execute payouts outside the normal schedule and may impact system
              load.
            </p>
          </div>
          <button
            type="button"
            className="ph2-btn-danger-lg"
            onClick={handleTriggerPayouts}
            disabled={triggerLoading || retryFailedLoading}
          >
            {triggerLoading ? 'Running…' : 'Trigger Payouts Now'}
          </button>
        </div>
      </section>
    </div>
  )
}
