import { NavLink } from 'react-router-dom'
import { Button } from '../../components/ui'
import { formatAdminDateTime } from '../../utils/format'
import { usePaymentsAdmin } from './PaymentsAdminContext'
import { C } from './paymentsShared'

const QUEUE_ITEMS = [
  {
    key: 'pending',
    label: 'Pending',
    hint: 'Captured ONLINE, waiting for payout window (payoutAt).',
    accent: C.warning,
  },
  {
    key: 'on_hold',
    label: 'On hold',
    hint: 'Released later (e.g. dispute / policy).',
    accent: '#ca8a04',
  },
  {
    key: 'processing',
    label: 'Processing',
    hint: 'Transfer in flight with RazorpayX.',
    accent: C.info,
  },
  {
    key: 'paid',
    label: 'Paid',
    hint: 'Money reached worker bank (ledger SUCCESS).',
    accent: C.success,
  },
  {
    key: 'failed',
    label: 'Failed',
    hint: 'RazorpayX error — eligible for retry cron or manual batch.',
    accent: C.danger,
  },
  {
    key: 'disputed',
    label: 'Disputed',
    hint: 'Payout side disputed — resolve in Disputes or Transactions detail.',
    accent: '#be123c',
  },
]

/** Matches backend ADMIN_CRON_LINES ids — human copy for the dashboard */
const CRON_JOB_HELP = {
  payout_due:
    'Runs only when you click “Run payout job”. Processes ONLINE rows that are captured, pending, past payoutAt, and not in dispute.',
  payout_retry:
    'Server job every 30 minutes (or your manual “Retry failed” batch). Retries failed ONLINE payouts up to the max attempt limit.',
  recovery:
    'Safety net: re-credits worker wallet if capture succeeded but wallet flag was not set (crash recovery).',
  dispute:
    'Moves stale open disputes toward auto-release per product rules.',
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
  } = usePaymentsAdmin()

  const maxRetries = s?.retryHealth?.maxAutoRetries ?? 3
  const retriable = s?.retryHealth?.retriableFailedCount ?? 0
  const retryBuckets = Array.isArray(s?.retryHealth?.retryCounts) ? s.retryHealth.retryCounts : []
  const maxBucket = retryBuckets.reduce((m, r) => Math.max(m, Number(r.count) || 0), 0) || 1
  const cronRows = Array.isArray(s?.cronSchedule) ? s.cronSchedule : []

  const pendingAll = s?.payoutStatus?.pendingAll ?? 0

  return (
    <div className="payments-cron">
      <header className="payments-cron__hero">
        <div className="payments-cron__hero-text">
          <p className="payments-cron__eyebrow">Operations</p>
          <h1 className="payments-cron__title">Payout cron &amp; queue</h1>
          <p className="payments-cron__lede">
            Due <strong>ONLINE</strong> payouts are released manually. The server runs retries, wallet recovery, and dispute timers on the schedules below.
            Use <NavLink to="/payments/transactions" className="payments-cron__inline-link">Transactions</NavLink>
            {' '}for per-row actions.
          </p>
        </div>
        <div className="payments-cron__hero-actions">
          <button
            type="button"
            className="payments-cron__btn-refresh"
            onClick={fetchStats}
            disabled={statsLoading}
          >
            {statsLoading ? '↻ Updating…' : '↻ Refresh stats'}
          </button>
          <Button
            variant="secondary"
            onClick={handleTriggerPayouts}
            disabled={triggerLoading || retryFailedLoading}
          >
            {triggerLoading ? 'Running…' : 'Run payout job'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleRetryFailedPayoutsBatch}
            disabled={
              retryFailedLoading
              || triggerLoading
              || !(retriable > 0)
            }
          >
            {retryFailedLoading ? 'Retrying…' : `Retry failed (${retriable})`}
          </Button>
        </div>
      </header>

      <section className="payments-cron__callout" aria-label="How controls map to the backend">
        <div className="payments-cron__callout-icon" aria-hidden>ⓘ</div>
        <div>
          <strong className="payments-cron__callout-title">How it fits together</strong>
          <ul className="payments-cron__callout-list">
            <li>
              <strong>Run payout job</strong> calls the same code as the manual cron entry point: it only picks up{' '}
              <strong>captured · ONLINE · pending</strong> rows whose <code>payoutAt</code> is due. It does{' '}
              <strong>not</strong> retry <strong>failed</strong> rows.
            </li>
            <li>
              <strong>Retry failed</strong> matches the 30-minute retry job: failed ONLINE payouts under {maxRetries}{' '}
              Razorpay attempts and no open dispute.
            </li>
            <li>
              Recovery and dispute timers run on the server; you only inspect them here — refresh stats to see queue impact.
            </li>
          </ul>
        </div>
      </section>

      <div className="payments-cron__kpi-row">
        <div className="payments-cron__kpi payments-cron__kpi--accent">
          <span className="payments-cron__kpi-label">Queued for release</span>
          <span className="payments-cron__kpi-value">
            {statsLoading ? '…' : pendingAll.toLocaleString('en-IN')}
          </span>
          <span className="payments-cron__kpi-hint">pending + on_hold (captured)</span>
        </div>
        <div className={`payments-cron__kpi${retriable > 0 ? ' payments-cron__kpi--warn' : ''}`}>
          <span className="payments-cron__kpi-label">Retriable failed</span>
          <span className="payments-cron__kpi-value">
            {statsLoading ? '…' : retriable.toLocaleString('en-IN')}
          </span>
          <span className="payments-cron__kpi-hint">ONLINE · failed · under {maxRetries} attempts</span>
        </div>
        <div className="payments-cron__kpi">
          <span className="payments-cron__kpi-label">Auto-retry cap</span>
          <span className="payments-cron__kpi-value">{maxRetries}</span>
          <span className="payments-cron__kpi-hint">Razorpay attempts per row</span>
        </div>
      </div>

      <section className="payments-cron__section payments-page__card">
        <h2 className="payments-cron__section-title">Payout queue (captured payments)</h2>
        <p className="payments-cron__section-lede">
          Counts are live from the same aggregation the overview uses. Hover a card for a short definition.
        </p>
        <div className="payments-cron__queue-grid">
          {QUEUE_ITEMS.map(({ key, label, hint, accent }) => {
            const n = statsLoading ? null : Number(s?.payoutStatus?.[key]) || 0
            return (
              <div
                key={key}
                className="payments-cron__queue-card"
                title={hint}
              >
                <div className="payments-cron__queue-accent" style={{ background: accent }} aria-hidden />
                <div className="payments-cron__queue-body">
                  <span className="payments-cron__queue-label">{label}</span>
                  <span className="payments-cron__queue-count">
                    {n === null ? '…' : n.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="payments-cron__section payments-page__card">
        <div className="payments-cron__section-head">
          <h2 className="payments-cron__section-title">Failed ONLINE payouts by attempt count</h2>
          {retriable > 0 && (
            <Button
              variant="secondary"
              onClick={handleRetryFailedPayoutsBatch}
              disabled={retryFailedLoading || triggerLoading}
            >
              {retryFailedLoading ? 'Running batch…' : 'Run retry batch now'}
            </Button>
          )}
        </div>
        <p className="payments-cron__section-lede">
          Each bucket is how many failed rows recorded the same <code>payoutRetryCount</code> before the last Razorpay attempt.
          “0” can be legacy rows from before attempts were stored.
        </p>
        {statsLoading ? (
          <p className="payments-cron__muted">Loading…</p>
        ) : retryBuckets.length === 0 ? (
          <p className="payments-cron__muted">
            {retriable > 0
              ? 'Buckets appear after counts are grouped; you can still run the retry batch above.'
              : 'No failed ONLINE payout rows in the database for this view.'}
          </p>
        ) : (
          <div className="payments-cron__buckets">
            {retryBuckets.map((r, idx) => {
              const n = Number(r.attemptsRecorded)
              const cnt = Number(r.count) || 0
              const pct = Math.round((cnt / maxBucket) * 100)
              const hot = n >= maxRetries
              return (
                <div key={`retry-bucket-${idx}-${r.attemptsRecorded}`} className="payments-cron__bucket">
                  <div className="payments-cron__bucket-head">
                    <span className="payments-cron__bucket-label">
                      {n} attempt{n === 1 ? '' : 's'} recorded
                    </span>
                    <span className={`payments-cron__bucket-count${hot ? ' payments-cron__bucket-count--hot' : ''}`}>
                      {cnt.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="payments-cron__bucket-track">
                    <div
                      className={`payments-cron__bucket-fill${hot ? ' payments-cron__bucket-fill--hot' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="payments-cron__section payments-page__card">
        <h2 className="payments-cron__section-title">Server jobs &amp; schedules</h2>
        <p className="payments-cron__section-lede">
          Single source: <code>backend/src/config/paymentCronSchedule.js</code> — imported by{' '}
          <code>payoutCron.js</code> so labels and expressions stay aligned.
        </p>
        {cronRows.length === 0 ? (
          <p className="payments-cron__muted">No schedule data — refresh stats after deploying the latest API.</p>
        ) : (
          <ol className="payments-cron__timeline">
            {cronRows.map((row, index) => {
              const isManual = !row.cron
              const help = CRON_JOB_HELP[row.id] || ''
              return (
                <li key={row.id} className="payments-cron__timeline-item">
                  <div className="payments-cron__timeline-marker" aria-hidden>
                    <span className="payments-cron__timeline-dot" data-manual={isManual ? '1' : undefined} />
                    {index < cronRows.length - 1 && <span className="payments-cron__timeline-line" />}
                  </div>
                  <div className={`payments-cron__timeline-card${isManual ? ' payments-cron__timeline-card--manual' : ''}`}>
                    <div className="payments-cron__timeline-card-head">
                      <span className="payments-cron__timeline-badge" data-manual={isManual ? '1' : undefined}>
                        {isManual ? 'Manual / API' : 'Scheduled'}
                      </span>
                      <h3 className="payments-cron__timeline-name">{row.name}</h3>
                    </div>
                    <p className="payments-cron__timeline-schedule">{row.schedule}</p>
                    {row.cron && (
                      <code className="payments-cron__timeline-cron" title="Cron expression (server timezone)">
                        {row.cron}
                      </code>
                    )}
                    {help && <p className="payments-cron__timeline-help">{help}</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {!statsLoading && s?.generatedAt && (
        <p className="payments-cron__footer-meta">
          Queue figures from live snapshot · {formatAdminDateTime(s.generatedAt)}
        </p>
      )}
    </div>
  )
}
