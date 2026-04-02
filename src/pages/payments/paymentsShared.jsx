import { disputeStatusLabel, DISPUTE_RESOLVE_OUTCOME_OPTIONS } from '../../constants/paymentEnums'

export const C = {
  bg: '#fff',
  surface: '#f9fafb',
  border: '#e5e7eb',
  text: '#111827',
  muted: '#6b7280',
  primary: '#6d28d9',
  success: '#059669',
  successBg: '#d1fae5',
  warning: '#d97706',
  warningBg: '#fef3c7',
  danger: '#dc2626',
  dangerBg: '#fee2e2',
  info: '#2563eb',
  infoBg: '#dbeafe',
  secondary: '#6b7280',
  secondaryBg: '#f3f4f6',
}

export const PAGE_SIZE = 20

export function formatCurrency(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—'
}

export function formatFeePercentOfCollected(pct) {
  if (pct == null || Number.isNaN(Number(pct))) return null
  const n = Number(pct)
  const decimals = n >= 10 ? 1 : 2
  return `${n.toFixed(decimals)}% of collected`
}

export function canRetryFailedOnlinePayout(p, maxRetries = 3) {
  if (p.paymentType !== 'ONLINE') return false
  if (p.status !== 'captured') return false
  if (p.payoutStatus !== 'failed') return false
  if ((p.payoutRetryCount || 0) >= maxRetries) return false
  if (p.dispute?.status && p.dispute.status !== 'none') return false
  return true
}

export function normalizeDisputeStatus(p) {
  const s = p?.dispute?.status
  if (s == null || s === '') return null
  return String(s).trim().toLowerCase()
}

const STATUS_THEME = {
  captured: { bg: C.successBg, color: C.success },
  paid: { bg: C.successBg, color: C.success },
  resolved_worker: { bg: C.successBg, color: C.success },
  failed: { bg: C.dangerBg, color: C.danger },
  disputed: { bg: C.dangerBg, color: C.danger },
  open: { bg: C.dangerBg, color: C.danger },
  pending: { bg: C.warningBg, color: C.warning },
  on_hold: { bg: C.warningBg, color: C.warning },
  auto_released: { bg: C.warningBg, color: C.warning },
  initiated: { bg: C.infoBg, color: C.info },
  processing: { bg: C.infoBg, color: C.info },
  refunded: { bg: '#ede9fe', color: C.primary },
  resolved_employer: { bg: '#ede9fe', color: C.primary },
  underpaid: { bg: '#fef3c7', color: '#92400e' },
  expired: { bg: C.secondaryBg, color: C.secondary },
  not_applicable: { bg: C.secondaryBg, color: C.secondary },
}

export function formatTrendDayLabel(ymd) {
  if (!ymd || typeof ymd !== 'string') return '—'
  const parts = ymd.split('-').map(Number)
  if (parts.length < 3 || Number.isNaN(parts[0])) return ymd
  const [y, m, d] = parts
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export const TREND_CHART_INNER_PX = 128

export function TrendChart({ data, totals }) {
  const derivedTotals = totals ?? (Array.isArray(data) && data.length
    ? {
        amount: data.reduce((s, d) => s + (Number(d.amount) || 0), 0),
        count: data.reduce((s, d) => s + (Number(d.count) || 0), 0),
      }
    : { amount: 0, count: 0 })

  if (!data || !data.length) {
    return <p style={{ color: C.muted, fontSize: '0.875rem' }}>No chart data.</p>
  }

  const amounts = data.map((d) => Number(d.amount) || 0)
  const maxAmt = Math.max(...amounts, 1)
  const hasAny = amounts.some((a) => a > 0)

  return (
    <div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        gap: '0.35rem',
        marginBottom: 14,
        fontSize: '0.875rem',
      }}
      >
        <span style={{ fontWeight: 700, color: C.text, fontSize: '1.05rem' }}>
          {formatCurrency(derivedTotals.amount)}
        </span>
        <span style={{ color: C.muted }}>
          captured in this window · {derivedTotals.count} payment{derivedTotals.count === 1 ? '' : 's'}
        </span>
      </div>
      {!hasAny && (
        <p style={{ color: C.muted, fontSize: '0.8125rem', marginBottom: 10 }}>
          No payments moved to <strong>captured</strong> on these days (IST). Older orders appear once they are verified.
        </p>
      )}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
        minHeight: TREND_CHART_INNER_PX + 56,
        padding: '8px 4px 4px',
        background: C.surface,
        borderRadius: 10,
        border: `1px solid ${C.border}`,
      }}
      >
        {data.map((d) => {
          const amt = Number(d.amount) || 0
          const cnt = Number(d.count) || 0
          const barH = amt > 0
            ? Math.max(Math.round((amt / maxAmt) * TREND_CHART_INNER_PX), 12)
            : 4
          return (
            <div
              key={d._id}
              style={{
                flex: 1,
                minWidth: 0,
                maxWidth: 72,
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: amt > 0 ? C.text : C.muted,
                marginBottom: 6,
                textAlign: 'center',
                lineHeight: 1.25,
                minHeight: 28,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
              }}
              >
                {amt > 0 ? formatCurrency(amt) : '—'}
              </div>
              <div
                title={`${d._id}: ${formatCurrency(amt)} · ${cnt} payment(s)`}
                style={{
                  width: '100%',
                  height: barH,
                  borderRadius: '8px 8px 4px 4px',
                  background: amt > 0
                    ? `linear-gradient(180deg, ${C.primary} 0%, #4c1d95 100%)`
                    : `linear-gradient(180deg, ${C.border} 0%, ${C.secondaryBg} 100%)`,
                  boxShadow: amt > 0 ? '0 2px 6px rgba(109, 40, 217, 0.25)' : 'none',
                  cursor: 'default',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
              />
              <div style={{
                marginTop: 10,
                fontSize: 11,
                fontWeight: 500,
                color: C.muted,
                textAlign: 'center',
                lineHeight: 1.2,
              }}
              >
                {formatTrendDayLabel(d._id)}
              </div>
              {cnt > 0 && (
                <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{cnt}x</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function StatCard({ label, value, sub, accentColor = C.primary, icon }) {
  return (
    <div style={{
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: '1.25rem',
      position: 'relative',
      overflow: 'hidden',
      flex: '1 1 180px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accentColor }} />
      {icon && (
        <div style={{ position: 'absolute', top: 14, right: 16, fontSize: 20, opacity: 0.3 }}>{icon}</div>
      )}
      <div style={{ fontSize: '0.8125rem', color: C.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: C.text }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

export function DisputeQueueStatusBadge({ dispute: d }) {
  const dst = d?.status
  const c = STATUS_THEME[dst] || { bg: C.secondaryBg, color: C.secondary }
  return (
    <span style={{
      background: c.bg,
      color: c.color,
      borderRadius: 9999,
      padding: '0.2rem 0.55rem',
      fontSize: '0.72rem',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      display: 'inline-block',
    }}
    >
      {disputeStatusLabel(d)}
    </span>
  )
}

export function SectionHeading({ children }) {
  return (
    <div style={{
      fontSize: '0.8125rem', fontWeight: 700, color: C.muted,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      marginBottom: 12, paddingBottom: 8,
      borderBottom: `1px solid ${C.border}`,
    }}>
      {children}
    </div>
  )
}

export function resolveOutcomeHint(disputeStatus) {
  const o = DISPUTE_RESOLVE_OUTCOME_OPTIONS.find((x) => x.value === disputeStatus)
  return o?.hint || ''
}

export function disputeRaisedByLabel(p) {
  if (p.dispute?.reason === 'worker_denied_cash_receipt') {
    const w = p.workerId
    if (w && typeof w === 'object') return w.fullName || w.phoneNumber || 'Worker'
    return 'Worker'
  }
  const u = p.user
  if (u && typeof u === 'object') return u.name || u.phone || 'Employer'
  return '—'
}

export function StatusPill({ status, count, loading }) {
  const c = STATUS_THEME[status] || { bg: C.secondaryBg, color: C.secondary }
  return (
    <div style={{
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: '10px 18px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 5, minWidth: 100,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    }}>
      <span style={{ background: c.bg, color: c.color, borderRadius: 9999, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
        {status}
      </span>
      <span style={{ fontSize: 20, fontWeight: 700, color: C.text }}>
        {loading ? '…' : (count ?? 0).toLocaleString('en-IN')}
      </span>
    </div>
  )
}
