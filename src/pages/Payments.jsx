import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { paymentApi } from '../services/api'
import { getErrorMessage, formatAdminDateTime } from '../utils/format'
import { isMongoObjectIdString } from '../utils/mongoId'
import {
  PAYMENT_STATUS_OPTIONS,
  PAYOUT_STATUS_OPTIONS,
  paymentStatusLabel,
  payoutStatusLabel,
  paymentStatusBadgeClass,
  payoutStatusBadgeClass,
  disputeStatusLabel,
} from '../constants/paymentEnums'
import {
  PageHeader,
  SummaryCard,
  SearchToolbar,
  DataTable,
  TableEmptyRow,
  Pagination,
  Alert,
  Button,
} from '../components/ui'
import ConfirmModal from '../components/ConfirmModal'
import '../styles/ManagementPage.css'

// ── Palette — matches admin dashboard light theme ──────────────────────────────
const C = {
  bg: '#fff',
  surface: '#f9fafb',
  border: '#e5e7eb',
  text: '#111827',
  muted: '#6b7280',
  primary: '#6d28d9',   // purple
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

function formatCurrency(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—'
}

const PAGE_SIZE = 20

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview', label: '📊 Overview' },
  { key: 'transactions', label: '🧾 Transactions' },
  { key: 'payouts', label: '⚙️ Payout Cron' },
  { key: 'disputes', label: '⚠️ Disputes' },
]

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accentColor = C.primary, icon }) {
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

// ── Status badge (light-theme friendly) ───────────────────────────────────────
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

function StatusBadge({ status }) {
  const c = STATUS_THEME[status] || { bg: C.secondaryBg, color: C.secondary }
  return (
    <span style={{
      background: c.bg, color: c.color,
      borderRadius: 9999, padding: '0.2rem 0.6rem',
      fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
      display: 'inline-block',
    }}>
      {status || '—'}
    </span>
  )
}

// ── Mini bar chart ─────────────────────────────────────────────────────────────
function TrendChart({ data }) {
  if (!data || !data.length) {
    return <p style={{ color: C.muted, fontSize: '0.875rem' }}>No data in last 7 days.</p>
  }
  const maxAmt = Math.max(...data.map((d) => d.amount), 1)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, marginBottom: 4 }}>
        {data.map((d) => {
          const pct = Math.max(Math.round((d.amount / maxAmt) * 100), 4)
          return (
            <div key={d._id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                title={`${d._id}: ${formatCurrency(d.amount)} (${d.count} payments)`}
                style={{
                  width: '100%', height: `${pct}%`,
                  background: C.primary,
                  borderRadius: '4px 4px 0 0',
                  opacity: 0.7, cursor: 'default',
                  transition: 'opacity .15s',
                }}
                onMouseEnter={(e) => (e.target.style.opacity = 1)}
                onMouseLeave={(e) => (e.target.style.opacity = 0.7)}
              />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {data.map((d) => (
          <div key={d._id} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: C.muted }}>
            {d._id.slice(5)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ children }) {
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

// ── Pill counter ──────────────────────────────────────────────────────────────
function StatusPill({ status, count, loading }) {
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

// ── Main component ─────────────────────────────────────────────────────────────
export default function Payments() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const jobIdFromUrl = searchParams.get('jobId') || ''

  const [activeTab, setActiveTab] = useState('overview')

  // Stats
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState('')

  // Transactions
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [payoutFilter, setPayoutFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [jobIdFilter, setJobIdFilter] = useState(jobIdFromUrl)
  const [triggerLoading, setTriggerLoading] = useState(false)
  const [disputeModal, setDisputeModal] = useState(null)
  const [disputeLoading, setDisputeLoading] = useState(false)

  useEffect(() => {
    if (jobIdFromUrl) setJobIdFilter(jobIdFromUrl)
  }, [jobIdFromUrl])

  // ── Fetch stats ───────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError('')
    try {
      const res = await paymentApi.getDashboardStats()
      setStats(res?.data || null)
    } catch (err) {
      setStatsError(getErrorMessage(err, 'Failed to load payment stats'))
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // ── Fetch transactions ────────────────────────────────────────────────────
  const fetchList = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError('')
      setSuccess('')
      const trimmedJob = jobIdFilter.trim()
      if (trimmedJob && !isMongoObjectIdString(trimmedJob)) {
        setError('Job ID must be 24 hex characters (copy from the job URL).')
        setRows([])
        setPagination((p) => ({ ...p, total: 0, pages: 0 }))
        setLoading(false)
        return
      }
      try {
        const res = await paymentApi.listAdminAll({
          page, limit: PAGE_SIZE,
          status: statusFilter || undefined,
          payoutStatus: payoutFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          jobId: trimmedJob || undefined,
        })
        const list = Array.isArray(res?.data) ? res.data : []
        const total = typeof res?.total === 'number' ? res.total : 0
        const pages = typeof res?.pages === 'number' ? res.pages : 0
        const currentPage = typeof res?.page === 'number' ? res.page : page
        setRows(list)
        setPagination((p) => ({ ...p, page: currentPage, total, pages: pages || (total ? Math.ceil(total / p.limit) : 0) }))
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load payments'))
        setPagination((p) => ({ ...p, total: 0, pages: 0 }))
        setRows([])
      } finally {
        setLoading(false)
      }
    },
    [statusFilter, payoutFilter, startDate, endDate, jobIdFilter]
  )

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => {
    if (activeTab === 'transactions') fetchList(pagination.page)
  }, [activeTab]) // eslint-disable-line
  useEffect(() => {
    if (activeTab === 'transactions') fetchList(pagination.page)
  }, [fetchList, pagination.page]) // eslint-disable-line

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleTriggerPayouts = async () => {
    setTriggerLoading(true); setError(''); setSuccess('')
    try {
      const res = await paymentApi.triggerPayouts()
      const data = res?.data ?? res
      setSuccess(`Payout run finished: ${data?.processed ?? 0} processed, ${data?.failed ?? 0} failed.`)
      fetchStats()
      if (activeTab === 'transactions') fetchList(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Trigger payouts failed'))
    } finally {
      setTriggerLoading(false)
    }
  }

  const confirmResolveDispute = async () => {
    if (!disputeModal) return
    setDisputeLoading(true)
    try {
      await paymentApi.resolveDispute(disputeModal.payment._id, disputeModal.resolution)
      setDisputeModal(null)
      fetchStats()
      if (activeTab === 'transactions') fetchList(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Resolve dispute failed'))
    } finally {
      setDisputeLoading(false)
    }
  }

  const s = stats
  const openDisputesOnPage = rows.filter((r) => r.dispute?.status === 'open').length
  const hasRetryAlert = s && s.retryHealth?.retriableFailedCount > 0

  return (
    <div className="mgmt-page">
      <PageHeader
        title="Payments"
        subtitle="Employer collections, worker payouts, cron health, and disputes."
        secondaryAction={
          <Button variant="secondary" onClick={handleTriggerPayouts} disabled={triggerLoading}>
            {triggerLoading ? 'Running payout job…' : '⚡ Run Payout Job'}
          </Button>
        }
      />

      {/* Global alerts */}
      {hasRetryAlert && (
        <Alert variant="warning" className="mgmt-alert">
          ⚠️ {s.retryHealth.retriableFailedCount} payout(s) failed and queued for retry. Click "Run Payout Job" to process now.
        </Alert>
      )}
      {error && <Alert variant="error" className="mgmt-alert">{error}</Alert>}
      {success && <Alert variant="info" className="mgmt-alert">{success}</Alert>}
      {statsError && <Alert variant="error" className="mgmt-alert">{statsError}</Alert>}

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex', borderBottom: `1px solid ${C.border}`,
        marginBottom: 24, flexWrap: 'wrap',
      }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 20px', background: 'none', border: 'none',
                borderBottom: active ? `2px solid ${C.primary}` : '2px solid transparent',
                color: active ? C.primary : C.muted,
                fontWeight: active ? 700 : 400,
                fontSize: '0.9375rem', cursor: 'pointer',
                transition: 'all .15s', whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
              {tab.key === 'disputes' && s?.disputes?.open > 0 && (
                <span style={{
                  marginLeft: 6, background: C.danger, color: '#fff',
                  borderRadius: 9999, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                }}>
                  {s.disputes.open}
                </span>
              )}
              {tab.key === 'payouts' && s?.retryHealth?.retriableFailedCount > 0 && (
                <span style={{
                  marginLeft: 6, background: C.warning, color: '#fff',
                  borderRadius: 9999, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                }}>!</span>
              )}
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <button
          onClick={fetchStats}
          disabled={statsLoading}
          style={{ padding: '10px 14px', background: 'none', border: 'none', color: C.muted, fontSize: '0.875rem', cursor: 'pointer' }}
        >
          {statsLoading ? '↻ Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1 — OVERVIEW                                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div>
          {/* Money cards */}
          <SectionHeading>💰 Money Overview</SectionHeading>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
            <StatCard label="Total Collected" value={statsLoading ? '…' : formatCurrency(s?.revenue?.totalCollected)} sub="Employer payments captured" accentColor={C.success} icon="💸" />
            <StatCard label="Disbursed to Banks" value={statsLoading ? '…' : formatCurrency(s?.revenue?.disbursedToBank)} sub="Via RazorpayX to workers" accentColor="#10b981" icon="🏦" />
            <StatCard label="Platform Revenue" value={statsLoading ? '…' : formatCurrency(s?.revenue?.platformFeeEarned)} sub="Commission (10%)" accentColor={C.primary} icon="🏛" />
            <StatCard label="In Worker Wallets" value={statsLoading ? '…' : formatCurrency(s?.revenue?.pendingInWallets)} sub="Credited, not yet in bank" accentColor={C.info} icon="👛" />
            <StatCard label="Pending Payouts" value={statsLoading ? '…' : `${(s?.payoutStatus?.pendingAll ?? 0).toLocaleString('en-IN')} payments`} sub="Queued for cron" accentColor={C.warning} icon="⏳" />
          </div>

          {/* Payment status */}
          <SectionHeading>📋 Payment Status</SectionHeading>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
            {['captured', 'pending', 'initiated', 'failed', 'refunded', 'underpaid', 'expired'].map((k) => (
              <StatusPill key={k} status={k} count={s?.paymentStatus?.[k]} loading={statsLoading} />
            ))}
          </div>

          {/* Mix + trend */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'start', marginBottom: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 210 }}>
              <SectionHeading>💳 Payment Mix</SectionHeading>
              {[
                { label: 'Online (Razorpay)', key: 'online' },
                { label: 'Cash', key: 'cash' },
              ].map(({ label, key }) => (
                <div key={key} style={{
                  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: '1rem 1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ fontSize: '0.8125rem', color: C.muted, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: C.text }}>
                    {statsLoading ? '…' : (s?.paymentTypeSplit?.[key]?.count ?? 0).toLocaleString('en-IN')} payments
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: C.muted }}>
                    {statsLoading ? '' : formatCurrency(s?.paymentTypeSplit?.[key]?.total)} total
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <SectionHeading>📈 Last 7 Days — Captured Payments</SectionHeading>
              {statsLoading
                ? <p style={{ color: C.muted, fontSize: '0.875rem' }}>Loading…</p>
                : <TrendChart data={s?.dailyTrend} />
              }
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2 — TRANSACTIONS                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'transactions' && (
        <>
          <div className="mgmt-cards">
            <SummaryCard
              value={loading ? '…' : pagination.total}
              label="Payments (this filter)"
              meta={openDisputesOnPage > 0 ? `${openDisputesOnPage} open dispute(s) on this page` : undefined}
              metaVariant={openDisputesOnPage > 0 ? 'warning' : undefined}
            />
          </div>

          <SearchToolbar
            searchValue={jobIdFilter}
            onSearchChange={setJobIdFilter}
            onSearchSubmit={(e) => { e.preventDefault(); setPagination((p) => ({ ...p, page: 1 })); fetchList(1) }}
            searchPlaceholder="Filter by job MongoDB id…"
            onRefresh={() => fetchList(pagination.page)}
            refreshing={loading}
          />

          <div className="mgmt-toolbar" style={{ flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <select className="mgmt-select" aria-label="Payment status" value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })) }}>
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || 'all-pay'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select className="mgmt-select" aria-label="Payout status" value={payoutFilter}
              onChange={(e) => { setPayoutFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })) }}>
              {PAYOUT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || 'all-payout'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', color: C.text }}>
              From
              <input type="date" className="mgmt-search-input" style={{ width: 'auto', border: `1px solid ${C.border}`, borderRadius: 6, padding: '0 8px', height: 36 }}
                value={startDate} onChange={(e) => { setStartDate(e.target.value); setPagination((p) => ({ ...p, page: 1 })) }} />
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', color: C.text }}>
              To
              <input type="date" className="mgmt-search-input" style={{ width: 'auto', border: `1px solid ${C.border}`, borderRadius: 6, padding: '0 8px', height: 36 }}
                value={endDate} onChange={(e) => { setEndDate(e.target.value); setPagination((p) => ({ ...p, page: 1 })) }} />
            </label>
          </div>

          <DataTable loading={loading} loadingMessage="Loading payments…" emptyColSpan={13}>
            <table className="mgmt-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Job</th>
                  <th>Worker</th>
                  <th>Employer</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Platform Fee</th>
                  <th>Worker Gets</th>
                  <th>Status</th>
                  <th>Payout</th>
                  <th>Dispute</th>
                  <th>Retries</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && !error && (
                  <TableEmptyRow colSpan={13} message="No payments found." />
                )}
                {rows.map((p) => {
                  const job = p.jobId
                  const jobRef = job && (job._id || job)
                  const jobTitle = job?.jobTitle || '—'
                  const w = p.workerId
                  const wid = w?._id || w
                  const u = p.user
                  const disputeOpen = p.dispute?.status === 'open'
                  return (
                    <tr key={p._id}>
                      <td style={{ color: C.muted, whiteSpace: 'nowrap' }}>{formatAdminDateTime(p.createdAt)}</td>
                      <td>
                        {jobRef
                          ? <button type="button" className="mgmt-link" onClick={() => navigate(`/jobs/${jobRef}`)}>{jobTitle}</button>
                          : jobTitle}
                      </td>
                      <td>
                        {wid
                          ? <button type="button" className="mgmt-link" onClick={() => navigate(`/workers/${wid}`)}>
                            {w?.fullName || w?.phoneNumber || String(wid).slice(-6)}
                          </button>
                          : '—'}
                      </td>
                      <td>{u?.phone || u?.name || '—'}</td>
                      <td>
                        <span style={{
                          background: p.paymentType === 'CASH' ? C.warningBg : C.infoBg,
                          color: p.paymentType === 'CASH' ? C.warning : C.info,
                          borderRadius: 9999, padding: '2px 9px', fontSize: 11, fontWeight: 600,
                        }}>{p.paymentType || '—'}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                      <td style={{ color: C.muted }}>{formatCurrency(p.platformFee)}</td>
                      <td style={{ color: C.success, fontWeight: 600 }}>{formatCurrency(p.workerAmount)}</td>
                      <td>
                        <span className={`mgmt-badge ${paymentStatusBadgeClass(p.status)}`}>
                          {paymentStatusLabel(p.status)}
                        </span>
                      </td>
                      <td>
                        <span className={`mgmt-badge ${payoutStatusBadgeClass(p.payoutStatus)}`}>
                          {payoutStatusLabel(p.payoutStatus)}
                        </span>
                      </td>
                      <td>{disputeStatusLabel(p.dispute)}</td>
                      <td style={{ textAlign: 'center', color: p.payoutRetryCount > 0 ? C.warning : C.muted }}>
                        {p.payoutRetryCount || 0}
                      </td>
                      <td>
                        <div className="mgmt-actions-cell">
                          {jobRef && (
                            <button type="button" className="mgmt-action-btn" onClick={() => navigate(`/jobs/${jobRef}`)}>Job</button>
                          )}
                          {disputeOpen && (
                            <>
                              <button type="button" className="mgmt-action-btn mgmt-action-btn-success"
                                onClick={() => setDisputeModal({ payment: p, resolution: 'worker' })}>→ Worker</button>
                              <button type="button" className="mgmt-action-btn"
                                onClick={() => setDisputeModal({ payment: p, resolution: 'employer' })}>→ Employer</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </DataTable>

          <Pagination
            page={pagination.page} pages={pagination.pages}
            total={pagination.total} limit={pagination.limit}
            onPrevious={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
            onNext={() => setPagination((p) => ({ ...p, page: Math.min(p.pages || 1, p.page + 1) }))}
          />
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3 — PAYOUT CRON HEALTH                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'payouts' && (
        <div>
          <SectionHeading>⚙️ Payout Queue Status</SectionHeading>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
            {[
              { key: 'pending', label: 'Pending', accentColor: C.warning },
              { key: 'on_hold', label: 'On Hold', accentColor: C.warning },
              { key: 'processing', label: 'Processing', accentColor: C.info },
              { key: 'paid', label: 'Paid ✓', accentColor: C.success },
              { key: 'failed', label: 'Failed', accentColor: C.danger },
              { key: 'disputed', label: 'Disputed', accentColor: C.danger },
            ].map(({ key, label, accentColor }) => (
              <StatCard key={key} label={label} accentColor={accentColor}
                value={statsLoading ? '…' : (s?.payoutStatus?.[key] ?? 0).toLocaleString('en-IN')} />
            ))}
          </div>

          <SectionHeading>🔁 Retry Attempts</SectionHeading>
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1.25rem', marginBottom: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            {statsLoading ? (
              <p style={{ color: C.muted }}>Loading…</p>
            ) : !s?.retryHealth?.retryCounts?.length ? (
              <p style={{ color: C.muted, fontSize: '0.875rem' }}>No payout retries recorded.</p>
            ) : (
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                {s.retryHealth.retryCounts.map((r) => (
                  <div key={r.attempt} style={{
                    background: r.attempt === 1 ? C.warningBg : r.attempt === 2 ? '#fef3c7' : C.dangerBg,
                    border: `1px solid ${r.attempt < 3 ? '#fde68a' : '#fecaca'}`,
                    borderRadius: 10, padding: '12px 20px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: r.attempt < 3 ? C.warning : C.danger }}>{r.count}</div>
                    <div style={{ fontSize: '0.75rem', color: C.muted }}>Attempt {r.attempt}</div>
                  </div>
                ))}
                {s.retryHealth.retriableFailedCount > 0 && (
                  <span style={{ color: C.danger, fontWeight: 600, fontSize: '0.875rem', marginLeft: 4 }}>
                    ⚠️ {s.retryHealth.retriableFailedCount} still retryable — click "Run Payout Job"
                  </span>
                )}
              </div>
            )}
          </div>

          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '12px 18px', fontSize: '0.875rem', color: C.muted,
          }}>
            <strong style={{ color: C.text }}>Cron schedule:</strong>
            &nbsp; Retry — every 30 min &nbsp;|&nbsp; Recovery — every 10 min &nbsp;|&nbsp; Dispute auto-release — every 6h
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4 — DISPUTES                                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'disputes' && (
        <div>
          <SectionHeading>⚠️ Dispute Summary</SectionHeading>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
            <StatCard label="Open Disputes" value={statsLoading ? '…' : (s?.disputes?.open ?? 0).toLocaleString('en-IN')} sub="Needs admin resolution" accentColor={C.danger} icon="🔴" />
            <StatCard label="Resolved → Worker" value={statsLoading ? '…' : (s?.disputes?.resolved_worker ?? 0).toLocaleString('en-IN')} sub="Payout released to worker" accentColor={C.success} icon="✅" />
            <StatCard label="Resolved → Employer" value={statsLoading ? '…' : (s?.disputes?.resolved_employer ?? 0).toLocaleString('en-IN')} sub="Refund path triggered" accentColor={C.primary} icon="↩️" />
            <StatCard label="Auto-Released" value={statsLoading ? '…' : (s?.disputes?.auto_released ?? 0).toLocaleString('en-IN')} sub="Auto-released after 72h" accentColor={C.warning} icon="⏱" />
          </div>

          <div style={{
            padding: '12px 18px',
            background: s?.disputes?.open > 0 ? C.dangerBg : C.successBg,
            border: `1px solid ${s?.disputes?.open > 0 ? '#fecaca' : '#a7f3d0'}`,
            borderRadius: 10, fontSize: '0.875rem',
            color: s?.disputes?.open > 0 ? C.danger : C.success,
            fontWeight: 500,
          }}>
            {s?.disputes?.open > 0
              ? `⚠️ ${s.disputes.open} open dispute(s) — go to Transactions tab, filter payout "Disputed", and use the resolve buttons.`
              : '✅ No open disputes right now.'}
          </div>
        </div>
      )}

      {/* Dispute resolve modal */}
      {disputeModal && (
        <ConfirmModal
          title="Resolve dispute"
          message={
            disputeModal.resolution === 'worker'
              ? 'Release payout to the worker and close this dispute?'
              : 'Resolve in favour of the employer (refund path on server)?'
          }
          confirmLabel="Confirm"
          onConfirm={confirmResolveDispute}
          onCancel={() => setDisputeModal(null)}
          loading={disputeLoading}
          variant={disputeModal.resolution === 'employer' ? 'danger' : 'primary'}
        />
      )}
    </div>
  )
}
