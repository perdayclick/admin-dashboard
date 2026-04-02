import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  DISPUTE_QUEUE_FILTER_OPTIONS,
  formatDisputeReason,
} from '../../constants/paymentEnums'
import {
  SearchToolbar,
  DataTable,
  TableEmptyRow,
  Pagination,
} from '../../components/ui'
import { formatAdminDateTime } from '../../utils/format'
import { usePaymentsAdmin } from './PaymentsAdminContext'
import {
  DisputeQueueStatusBadge,
  disputeRaisedByLabel,
  formatCurrency,
  normalizeDisputeStatus,
} from './paymentsShared'

export default function PaymentsDisputesPage() {
  const {
    navigate,
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
  } = usePaymentsAdmin()

  useEffect(() => {
    fetchDisputeList(disputePagination.page)
  }, [
    fetchDisputeList,
    disputePagination.page,
    disputeStatusFilter,
    disputeStartDate,
    disputeEndDate,
  ])

  const openCount = s?.disputes?.open ?? 0
  const totalFiltered = disputeListLoading ? null : disputePagination.total

  return (
    <div className="payments-page payments-disputes">
      <header className="payments-disputes__hero">
        <div className="payments-disputes__hero-main">
          <p className="payments-disputes__eyebrow">Finance · Disputes</p>
          <div className="payments-disputes__hero-row">
            <h1 className="payments-disputes__title">Dispute queue</h1>
            {!statsLoading && openCount > 0 && (
              <span className="payments-disputes__open-pill" title="Open disputes across the platform">
                {openCount.toLocaleString('en-IN')} open
              </span>
            )}
          </div>
          <p className="payments-disputes__lede">
            Review raised cases, evidence, and outcomes. Resolving applies to <strong>every open payment line</strong> for the same job.
            Payout retries and cron controls live under{' '}
            <NavLink to="/payments/payouts" className="payments-disputes__link">Payouts &amp; cron</NavLink>
            ; row-level payments in{' '}
            <NavLink to="/payments/transactions" className="payments-disputes__link">Transactions</NavLink>.
          </p>
        </div>
        <div className="payments-disputes__hero-actions">
          <button
            type="button"
            className="payments-disputes__btn-ghost"
            onClick={() => fetchStats()}
            disabled={statsLoading}
          >
            {statsLoading ? 'Updating summary…' : '↻ Refresh summary'}
          </button>
        </div>
      </header>

      {statsError && (
        <p className="payments-disputes__banner payments-disputes__banner--error" role="alert">
          {statsError}
        </p>
      )}

      <section className="payments-disputes__metrics" aria-label="Dispute totals from dashboard">
        <article className="payments-disputes__metric payments-disputes__metric--open">
          <span className="payments-disputes__metric-label">Open</span>
          <span className="payments-disputes__metric-value">
            {statsLoading ? '…' : openCount.toLocaleString('en-IN')}
          </span>
          <span className="payments-disputes__metric-hint">Needs a decision</span>
        </article>
        <article className="payments-disputes__metric">
          <span className="payments-disputes__metric-label">Resolved → worker</span>
          <span className="payments-disputes__metric-value">
            {statsLoading ? '…' : (s?.disputes?.resolved_worker ?? 0).toLocaleString('en-IN')}
          </span>
          <span className="payments-disputes__metric-hint">Payout released</span>
        </article>
        <article className="payments-disputes__metric">
          <span className="payments-disputes__metric-label">Resolved → employer</span>
          <span className="payments-disputes__metric-value">
            {statsLoading ? '…' : (s?.disputes?.resolved_employer ?? 0).toLocaleString('en-IN')}
          </span>
          <span className="payments-disputes__metric-hint">Refund path</span>
        </article>
        <article className="payments-disputes__metric">
          <span className="payments-disputes__metric-label">Auto-released</span>
          <span className="payments-disputes__metric-value">
            {statsLoading ? '…' : (s?.disputes?.auto_released ?? 0).toLocaleString('en-IN')}
          </span>
          <span className="payments-disputes__metric-hint">Cron / SLA</span>
        </article>
      </section>

      <div className="payments-disputes__tip">
        <span className="payments-disputes__tip-icon" aria-hidden>✦</span>
        <p>
          Use <strong>Resolve dispute</strong> for open rows (modal picks the outcome).
          <strong> Edit notes</strong> updates audit text only on closed disputes.
          Actions are in the last column — scroll horizontally on small screens.
        </p>
      </div>

      <section className="payments-disputes__panel payments-page__card" aria-labelledby="disputes-filters-heading">
        <div className="payments-disputes__panel-head">
          <h2 id="disputes-filters-heading" className="payments-disputes__panel-title">
            Filters &amp; list
          </h2>
          <p className="payments-disputes__panel-meta">
            {totalFiltered === null ? 'Loading…' : (
              <>
                <strong>{totalFiltered.toLocaleString('en-IN')}</strong>
                {' '}
                {totalFiltered === 1 ? 'row' : 'rows'}
                {' '}match this filter
              </>
            )}
          </p>
        </div>

        <SearchToolbar
          searchValue={disputeJobFilter}
          onSearchChange={setDisputeJobFilter}
          onSearchSubmit={(e) => {
            e.preventDefault()
            setDisputePagination((p) => ({ ...p, page: 1 }))
            fetchDisputeList(1)
          }}
          searchPlaceholder="Job ID (24 hex) — press Enter to search"
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

        <div className="payments-disputes__dates">
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

      <div className="payments-disputes__table-shell">
        <DataTable loading={disputeListLoading} loadingMessage="Loading disputes…" emptyColSpan={12}>
          <table className="mgmt-table mgmt-table--sticky-actions payments-disputes__table">
            <thead>
              <tr>
                <th>Dispute</th>
                <th>Raised</th>
                <th>Auto-release</th>
                <th>Reason</th>
                <th>Amount</th>
                <th>Job</th>
                <th>Worker</th>
                <th>Raised by</th>
                <th>Type</th>
                <th>Evidence</th>
                <th>Admin notes</th>
                <th className="payments-disputes__th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!disputeListLoading && disputeRows.length === 0 && !error && (
                <TableEmptyRow colSpan={12} message="No disputes match this filter." />
              )}
              {disputeRows.map((p) => {
                const job = p.jobId
                const jobRef = job && (job._id || job)
                const jobTitle = job?.jobTitle || '—'
                const w = p.workerId
                const wid = w?._id || w
                const disputeSt = normalizeDisputeStatus(p)
                const open = disputeSt === 'open'
                const ev = Array.isArray(p.dispute?.evidence) ? p.dispute.evidence : []
                return (
                  <tr key={p._id} className="payments-disputes__row">
                    <td>
                      <DisputeQueueStatusBadge dispute={p.dispute} />
                    </td>
                    <td className="payments-disputes__cell-muted payments-disputes__cell-nowrap">
                      {p.dispute?.raisedAt ? formatAdminDateTime(p.dispute.raisedAt) : '—'}
                    </td>
                    <td className="payments-disputes__cell-muted payments-disputes__cell-nowrap payments-disputes__cell-sm">
                      {open && p.dispute?.autoReleaseAt
                        ? formatAdminDateTime(p.dispute.autoReleaseAt)
                        : '—'}
                    </td>
                    <td className="payments-disputes__cell-reason">{formatDisputeReason(p.dispute?.reason)}</td>
                    <td className="payments-disputes__cell-amount">{formatCurrency(p.workerAmount ?? p.amount)}</td>
                    <td>
                      {jobRef ? (
                        <button type="button" className="mgmt-link" onClick={() => navigate(`/jobs/${jobRef}`)}>
                          {jobTitle}
                        </button>
                      ) : (
                        jobTitle
                      )}
                    </td>
                    <td>
                      {wid ? (
                        <button type="button" className="mgmt-link" onClick={() => navigate(`/workers/${wid}`)}>
                          {w?.fullName || w?.phoneNumber || String(wid).slice(-6)}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="payments-disputes__cell-sm">{disputeRaisedByLabel(p)}</td>
                    <td>
                      <span
                        className={
                          p.paymentType === 'CASH'
                            ? 'payments-disputes__type payments-disputes__type--cash'
                            : 'payments-disputes__type payments-disputes__type--online'
                        }
                      >
                        {p.paymentType || '—'}
                      </span>
                    </td>
                    <td className="payments-disputes__cell-evidence">
                      {ev.length === 0 ? '—' : (
                        <span className="payments-disputes__evidence-list">
                          {ev.slice(0, 3).map((url) => (
                            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="mgmt-link">
                              Link
                            </a>
                          ))}
                          {ev.length > 3 ? (
                            <span className="payments-disputes__evidence-more">+{ev.length - 3}</span>
                          ) : null}
                        </span>
                      )}
                    </td>
                    <td className="payments-disputes__cell-notes">
                      {p.dispute?.resolutionNotes ? p.dispute.resolutionNotes : '—'}
                    </td>
                    <td>
                      <div className="mgmt-actions-cell">
                        {jobRef && (
                          <button type="button" className="mgmt-action-btn" onClick={() => navigate(`/jobs/${jobRef}`)}>Job</button>
                        )}
                        {open && (
                          <button
                            type="button"
                            className="mgmt-action-btn mgmt-action-btn-success"
                            title="Set dispute outcome (applies to all open rows for this job)"
                            onClick={() => setDisputeModal({ payment: p, disputeStatus: 'resolved_worker' })}
                          >
                            Resolve dispute
                          </button>
                        )}
                        {!open && disputeSt && disputeSt !== 'none' && (
                          <button
                            type="button"
                            className="mgmt-action-btn"
                            title="Update internal admin notes only"
                            onClick={() => openDisputeNotesEditor(p)}
                          >
                            Edit notes
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </DataTable>
      </div>

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
  )
}
