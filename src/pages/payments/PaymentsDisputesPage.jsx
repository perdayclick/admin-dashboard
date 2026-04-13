import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { DISPUTE_QUEUE_FILTER_OPTIONS, formatDisputeReason } from '../../constants/paymentEnums'
import { SearchToolbar, Pagination, Avatar } from '../../components/ui'
import { formatAdminDateTime } from '../../utils/format'
import { usePaymentsAdmin } from './PaymentsAdminContext'
import {
  formatCurrencyTable,
  formatJobDisplayId,
  formatPaymentDisplayId,
  normalizeDisputeStatus,
} from './paymentsShared'
import './paymentsHubV2.css'

function jobLocationLine(job) {
  if (!job || typeof job !== 'object') return '—'
  const loc = job.location
  if (loc && typeof loc === 'object') {
    const parts = [loc.locality, loc.address, loc.landmark].filter(Boolean)
    return parts.length ? parts.join(', ') : '—'
  }
  return '—'
}

function employerNameFromJob(job) {
  const emp = job?.employerId
  if (emp && typeof emp === 'object') return emp.businessName || emp.companyName || '—'
  return '—'
}

/** Short label for inbox + detail subtitle */
function raisedByShortLabel(p) {
  if (p?.dispute?.reason === 'worker_denied_cash_receipt') return 'Raised by worker'
  return 'Raised by employer'
}

function raisedByAvatarName(p) {
  if (p?.dispute?.reason === 'worker_denied_cash_receipt') {
    const w = p.workerId
    return w?.fullName || w?.phoneNumber || 'Worker'
  }
  return p.user?.name || p.user?.phone || 'Employer'
}

function evidenceFileName(url) {
  try {
    const u = String(url).split('?')[0]
    const seg = u.split('/').pop()
    return seg || 'File'
  } catch {
    return 'File'
  }
}

function isLikelyImageUrl(url) {
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(String(url))
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

export default function PaymentsDisputesPage() {
  const {
    stats: s,
    statsLoading,
    statsError,
    fetchStats,
    disputeRows,
    disputePagination,
    setDisputePagination,
    disputeListLoading,
    error,
    disputeStatusFilter,
    setDisputeStatusFilter,
    disputeJobFilter,
    setDisputeJobFilter,
    disputeStartDate,
    setDisputeStartDate,
    disputeEndDate,
    setDisputeEndDate,
    fetchDisputeList,
    setDisputeModal,
    openDisputeNotesEditor,
    disputeResolutionNotes,
    setDisputeResolutionNotes,
  } = usePaymentsAdmin()

  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    fetchDisputeList(disputePagination.page)
  }, [
    fetchDisputeList,
    disputePagination.page,
    disputeStatusFilter,
    disputeStartDate,
    disputeEndDate,
  ])

  useEffect(() => {
    if (!disputeRows.length) {
      setSelectedId(null)
      return
    }
    setSelectedId((prev) => {
      if (prev && disputeRows.some((r) => String(r._id) === String(prev))) return prev
      return disputeRows[0]._id
    })
  }, [disputeRows])

  useEffect(() => {
    setDisputeResolutionNotes('')
  }, [selectedId, setDisputeResolutionNotes])

  const selected = useMemo(
    () => disputeRows.find((r) => String(r._id) === String(selectedId)) || null,
    [disputeRows, selectedId]
  )

  const openCount = s?.disputes?.open ?? 0
  const disputeSt = selected ? normalizeDisputeStatus(selected) : null
  const isOpen = disputeSt === 'open'

  return (
    <div className="ph2-page payments-disputes-v2">
      <header className="ph2-hero" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="ph2-title">Disputes management</h1>
          <p className="ph2-sub">Review and resolve payment disputes — payouts stay frozen until resolved.</p>
        </div>
        <button
          type="button"
          className="payments-disputes__btn-ghost"
          onClick={() => fetchStats()}
          disabled={statsLoading}
          style={{ alignSelf: 'flex-start' }}
        >
          {statsLoading ? 'Updating…' : '↻ Refresh summary'}
        </button>
      </header>

      {statsError && (
        <p className="payments-disputes__banner payments-disputes__banner--error" role="alert">
          {statsError}
        </p>
      )}

      {openCount > 0 && (
        <div className="ph2-dispute-banner" role="status">
          <span aria-hidden style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div>
            <strong>
              {openCount.toLocaleString('en-IN')} active dispute{openCount === 1 ? '' : 's'} requiring attention
            </strong>
            <p>All related payouts are frozen until admin resolution.</p>
          </div>
        </div>
      )}

      <section className="payments-disputes__panel payments-page__card" style={{ marginBottom: 16 }}>
        <SearchToolbar
          searchValue={disputeJobFilter}
          onSearchChange={setDisputeJobFilter}
          onSearchSubmit={(e) => {
            e.preventDefault()
            setDisputePagination((p) => ({ ...p, page: 1 }))
            fetchDisputeList(1)
          }}
          searchPlaceholder="Filter by Job ID (24 hex) — Enter"
          filterOptions={DISPUTE_QUEUE_FILTER_OPTIONS}
          filterValue={disputeStatusFilter}
          onFilterChange={(v) => {
            setDisputeStatusFilter(v)
            setDisputePagination((p) => ({ ...p, page: 1 }))
          }}
          filterLabel="Dispute state"
          onRefresh={() => fetchDisputeList(disputePagination.page)}
          refreshing={disputeListLoading}
        />
        <div className="payments-disputes__dates" style={{ marginTop: 12 }}>
          <label className="payments-disputes__date-field">
            <span className="payments-disputes__date-label">Raised from</span>
            <input
              type="date"
              className="payments-disputes__date-input"
              value={disputeStartDate}
              onChange={(e) => {
                setDisputeStartDate(e.target.value)
                setDisputePagination((p) => ({ ...p, page: 1 }))
              }}
            />
          </label>
          <label className="payments-disputes__date-field">
            <span className="payments-disputes__date-label">Raised to</span>
            <input
              type="date"
              className="payments-disputes__date-input"
              value={disputeEndDate}
              onChange={(e) => {
                setDisputeEndDate(e.target.value)
                setDisputePagination((p) => ({ ...p, page: 1 }))
              }}
            />
          </label>
        </div>
      </section>

      {error && <p className="payments-disputes__banner payments-disputes__banner--error">{error}</p>}

      <div className="ph2-dispute-layout">
        <div className="ph2-dispute-inbox-col">
          <div className="ph2-dispute-inbox-head">
            <h2>Dispute inbox</h2>
            <p className="ph2-muted">
              {disputeListLoading ? 'Loading…' : `${disputePagination.total.toLocaleString('en-IN')} total disputes`}
            </p>
          </div>
          <div className="ph2-inbox-scroll">
            <div className="ph2-inbox">
              {disputeListLoading && <p className="ph2-muted">Loading disputes…</p>}
              {!disputeListLoading && disputeRows.length === 0 && (
                <p className="ph2-muted">No disputes match this filter.</p>
              )}
              {disputeRows.map((p) => {
                const open = normalizeDisputeStatus(p) === 'open'
                const sel = String(p._id) === String(selectedId)
                return (
                  <button
                    key={p._id}
                    type="button"
                    className={`ph2-inbox-card${sel ? ' ph2-inbox-card--sel' : ''}`}
                    onClick={() => setSelectedId(p._id)}
                  >
                    <div className="ph2-inbox-card__top">
                      <span className="ph2-inbox-id">{formatPaymentDisplayId(p)}</span>
                      <span className={`ph2-inbox-badge ${open ? 'ph2-inbox-badge--open' : 'ph2-inbox-badge--closed'}`}>
                        {open ? 'OPEN' : (normalizeDisputeStatus(p) || '—').toUpperCase()}
                      </span>
                    </div>
                    <div className="ph2-inbox-who">
                      <Avatar nameOrEmail={raisedByAvatarName(p)} />
                      <span>{raisedByShortLabel(p)}</span>
                    </div>
                    <p className="ph2-inbox-snippet">{formatDisputeReason(p.dispute?.reason)}</p>
                    <div className="ph2-inbox-time">
                      <ClockIcon />
                      {p.dispute?.raisedAt ? formatAdminDateTime(p.dispute.raisedAt) : '—'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="ph2-inbox-footer">
            <Pagination
              page={disputePagination.page}
              pages={disputePagination.pages}
              total={disputePagination.total}
              limit={disputePagination.limit}
              onPrevious={() => setDisputePagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              onNext={() => setDisputePagination((p) => ({
                ...p,
                page: Math.min(p.pages || 1, p.page + 1),
              }))}
            />
          </div>
        </div>

        <div className="ph2-dispute-detail-wrap">
          <div className="ph2-detail-scroll">
            {!selected && <p className="ph2-muted">Select a dispute from the inbox.</p>}
            {selected && (
              <div className="ph2-detail-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                      {formatPaymentDisplayId(selected)}
                    </h2>
                    <p className="ph2-muted" style={{ margin: '8px 0 0', fontSize: '0.875rem' }}>
                      {raisedByShortLabel(selected)}
                      {' '}
                      ·
                      {selected.dispute?.raisedAt ? ` ${formatAdminDateTime(selected.dispute.raisedAt)}` : ' —'}
                    </p>
                  </div>
                  <span
                    className="ph2-detail-header-badge"
                    style={{
                      background: isOpen ? '#fef3c7' : '#f1f5f9',
                      color: isOpen ? '#b45309' : '#475569',
                    }}
                  >
                    {(normalizeDisputeStatus(selected) || '—').toUpperCase()}
                  </span>
                </div>

                <h3 style={{ margin: '1.35rem 0 0.5rem', fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                  Job context
                </h3>
                <dl className="ph2-detail-grid">
                  <div>
                    <dt>Job ID</dt>
                    <dd>
                      {selected.jobId && (selected.jobId._id || selected.jobId) ? (
                        <NavLink to={`/jobs/${selected.jobId._id || selected.jobId}`} className="ph2-id-link">
                          {formatJobDisplayId(selected.jobId)}
                        </NavLink>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>{jobLocationLine(selected.jobId)}</dd>
                  </div>
                  <div>
                    <dt>Employer</dt>
                    <dd>
                      <div className="ph2-cell-user">
                        <Avatar nameOrEmail={employerNameFromJob(selected.jobId)} />
                        <span className="ph2-cell-name">{employerNameFromJob(selected.jobId)}</span>
                      </div>
                    </dd>
                  </div>
                  <div>
                    <dt>Worker</dt>
                    <dd>
                      <div className="ph2-cell-user">
                        <Avatar nameOrEmail={selected.workerId?.fullName} />
                        <span className="ph2-cell-name">{selected.workerId?.fullName || '—'}</span>
                      </div>
                    </dd>
                  </div>
                </dl>

                <div className="ph2-disputed-block">
                  <p className="ph2-disputed-label">Disputed amount</p>
                  <p className="ph2-disputed-value">
                    {formatCurrencyTable(selected.workerAmount ?? selected.amount)}
                  </p>
                </div>

                <div className="ph2-reason-box">
                  <strong>Dispute reason</strong>
                  {formatDisputeReason(selected.dispute?.reason)}
                </div>

                {Array.isArray(selected.dispute?.evidence) && selected.dispute.evidence.length > 0 && (
                  <div style={{ marginTop: '1.15rem' }}>
                    <h3 style={{ margin: '0 0 0.35rem', fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                      Evidence submitted
                    </h3>
                    <div className="ph2-evidence-row">
                      {selected.dispute.evidence.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ph2-evidence-card"
                        >
                          {isLikelyImageUrl(url) ? (
                            <img src={url} alt="" loading="lazy" />
                          ) : (
                            <div className="ph2-evidence-card__doc" aria-hidden>
                              📄
                            </div>
                          )}
                          <span className="ph2-evidence-card__name">{evidenceFileName(url)}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {isOpen && (
                  <>
                    <div className="ph2-admin-resolution">
                      <label htmlFor="ph2-dispute-resolution-notes">Admin resolution</label>
                      <textarea
                        id="ph2-dispute-resolution-notes"
                        maxLength={2000}
                        placeholder="Enter detailed resolution notes explaining the decision and any actions taken…"
                        value={disputeResolutionNotes}
                        onChange={(e) => setDisputeResolutionNotes(e.target.value)}
                      />
                    </div>
                    <div className="ph2-resolve-btns">
                      <button
                        type="button"
                        className="ph2-btn-resolve-w"
                        onClick={() => setDisputeModal({ payment: selected, disputeStatus: 'resolved_worker' })}
                      >
                        Resolve for worker
                      </button>
                      <button
                        type="button"
                        className="ph2-btn-resolve-e"
                        onClick={() => setDisputeModal({ payment: selected, disputeStatus: 'resolved_employer' })}
                      >
                        Resolve for employer
                      </button>
                    </div>
                  </>
                )}
                {!isOpen && disputeSt && disputeSt !== 'none' && (
                  <button
                    type="button"
                    className="mgmt-action-btn"
                    style={{ marginTop: 20 }}
                    onClick={() => openDisputeNotesEditor(selected)}
                  >
                    Edit admin notes
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
