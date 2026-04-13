import { useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  PAYMENT_STATUS_OPTIONS,
  PAYOUT_STATUS_OPTIONS,
  paymentStatusLabel,
  paymentStatusBadgeClass,
  payoutStatusLabel,
  payoutStatusBadgeClass,
} from '../../constants/paymentEnums'
import { DataTable, TableEmptyRow, Pagination, Avatar } from '../../components/ui'
import { usePaymentsAdmin } from './PaymentsAdminContext'
import {
  formatCurrency,
  formatCurrencyTable,
  formatPaymentDisplayId,
  feePercentLabel,
} from './paymentsShared'
import './paymentsHubV2.css'

function employerDisplayName(p) {
  const job = p.jobId
  const emp = job && typeof job === 'object' ? job.employerId : null
  if (emp && typeof emp === 'object') {
    return emp.businessName || emp.companyName || '—'
  }
  return p.user?.name || p.user?.phone || '—'
}

function paymentTypeClass(t) {
  if (t === 'ONLINE') return 'ph2-type ph2-type--online'
  if (t === 'CASH') return 'ph2-type ph2-type--cash'
  return 'ph2-type ph2-type--cash'
}

function jobIdString(jobOrId) {
  if (!jobOrId) return ''
  if (typeof jobOrId === 'object' && jobOrId._id != null) return String(jobOrId._id)
  return String(jobOrId)
}

function shortenTxId(id) {
  const s = String(id)
  if (s.length <= 14) return s
  return `${s.slice(0, 6)}…${s.slice(-4)}`
}

export default function PaymentsTransactionsPage() {
  const {
    stats: s,
    statsLoading,
    rows,
    pagination,
    setPagination,
    loading,
    txViewMode,
    setTxViewMode,
    txSearchInput,
    setTxSearchInput,
    txQuickFilter,
    setTxQuickFilter,
    submitTxSearch,
    fetchList,
    txSearchQuery,
    jobGroups,
  } = usePaymentsAdmin()

  const sn = s?.adminSnapshot

  useEffect(() => {
    setTxViewMode('flat')
  }, [setTxViewMode])

  useEffect(() => {
    fetchList(pagination.page)
  }, [fetchList, pagination.page, txSearchQuery])

  const kpi = useMemo(() => {
    const vol7 = sn?.capturedVolumeLast7Days
    const wow = sn?.capturedVolumeWeekOverWeekPercent
    const pendingR = sn?.pendingPayoutWorkerRupees
    const openD = s?.disputes?.open
    const failedQ = s?.retryHealth?.retriableFailedCount
    const pendN = s?.payoutStatus?.pendingAll
    return {
      vol7,
      wow,
      pendingR,
      openD,
      failedQ,
      pendN,
    }
  }, [sn, s])

  const flatColSpan = 9

  return (
    <div className="ph2-page payments-tx-v2">
      <header className="ph2-hero">
        <h1 className="ph2-title">All Transactions</h1>
        <p className="ph2-sub">Complete payment transaction history — collections, fees, and payout state.</p>
      </header>

      <section className="ph2-kpi-grid" aria-label="Payment summary">
        <article className="ph2-kpi ph2-kpi--blue">
          <p className="ph2-kpi-label">Total volume (7d)</p>
          <p className="ph2-kpi-value">
            {statsLoading ? '…' : `₹${(kpi.vol7 ?? 0).toLocaleString('en-IN')}`}
          </p>
          <div className="ph2-kpi-meta">
            {kpi.wow != null && (
              <>
                <span aria-hidden>↑</span>
                {kpi.wow >= 0 ? '+' : ''}
                {kpi.wow}% vs prior week
              </>
            )}
            {kpi.wow == null && !statsLoading && <span>Not enough prior-week data</span>}
          </div>
          <div className="ph2-kpi-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        </article>

        <article className="ph2-kpi ph2-kpi--orange">
          <p className="ph2-kpi-label">Pending payouts</p>
          <p className="ph2-kpi-value">
            {statsLoading ? '…' : `₹${(kpi.pendingR ?? 0).toLocaleString('en-IN')}`}
          </p>
          <div className="ph2-kpi-meta">
            <span aria-hidden>⏱</span>
            {kpi.pendN != null ? `${kpi.pendN.toLocaleString('en-IN')} queued transfers` : '—'}
          </div>
          <div className="ph2-kpi-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
        </article>

        <article className="ph2-kpi ph2-kpi--red">
          <p className="ph2-kpi-label">Open disputes</p>
          <p className="ph2-kpi-value">
            {statsLoading ? '…' : (kpi.openD ?? 0).toLocaleString('en-IN')}
          </p>
          <div className="ph2-kpi-meta">
            <span aria-hidden>⚠</span>
            Requires admin action
          </div>
          <div className="ph2-kpi-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        </article>

        <article className="ph2-kpi ph2-kpi--green">
          <p className="ph2-kpi-label">Failed queue</p>
          <p className="ph2-kpi-value">
            {statsLoading ? '…' : (kpi.failedQ ?? 0).toLocaleString('en-IN')}
          </p>
          <div className="ph2-kpi-meta">
            <span aria-hidden>↻</span>
            Eligible for retry batch
          </div>
          <div className="ph2-kpi-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9h6v6" />
            </svg>
          </div>
        </article>
      </section>

      <div className="ph2-toolbar">
        <form
          className="ph2-search"
          onSubmit={(e) => {
            e.preventDefault()
            submitTxSearch()
          }}
          role="search"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search by Payment ID, employer, worker, job title…"
            value={txSearchInput}
            onChange={(e) => setTxSearchInput(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="ph2-search-btn" disabled={loading}>
            Search
          </button>
        </form>

        <div className="ph2-pills" role="group" aria-label="Quick filters">
          {[
            { id: 'all', label: 'All' },
            { id: 'failed_payout', label: 'Failed payouts' },
            { id: 'open_dispute', label: 'Open disputes' },
            { id: 'pending_cash', label: 'Pending cash' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`ph2-pill${txQuickFilter === id ? ' ph2-pill--active' : ''}`}
              onClick={() => {
                setTxQuickFilter(id)
                setPagination((p) => ({ ...p, page: 1 }))
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="ph2-table-card">
        {txViewMode === 'grouped' ? (
          <div className="payments-tx-groups" style={{ padding: '0.5rem 0' }}>
            {loading && <p className="ph2-muted">Loading job groups…</p>}
            {!loading && jobGroups.length === 0 && (
              <p className="ph2-muted" style={{ padding: '1rem' }}>No job payment groups match these filters.</p>
            )}
            {jobGroups.map((group) => {
              const jid = jobIdString(group.jobId)
              const title = group.job?.jobTitle || (jid ? `Job ${shortenTxId(jid)}` : 'Job')
              const t = group.totals || {}
              return (
                <article key={jid || String(group.jobId)} className="payments-tx-job-card payments-page__card" style={{ margin: '0.75rem 1rem' }}>
                  <header className="payments-tx-job-card__head">
                    <div className="payments-tx-job-card__title-row">
                      <h3 className="payments-tx-job-card__title">
                        {jid ? (
                          <NavLink to={`/jobs/${jid}`} className="payments-tx-job-card__job-link">{title}</NavLink>
                        ) : (
                          title
                        )}
                      </h3>
                      <span className="payments-tx-job-card__badge">{t.workerCount ?? 0} worker rows</span>
                    </div>
                    <dl className="payments-tx-job-card__totals">
                      <div>
                        <dt>Sum line ₹</dt>
                        <dd>{formatCurrency(t.sumEmployerLineAmount)}</dd>
                      </div>
                      <div>
                        <dt>Sum platform fee</dt>
                        <dd>{formatCurrency(t.sumPlatformFee)}</dd>
                      </div>
                      <div>
                        <dt>Sum to workers</dt>
                        <dd>{formatCurrency(t.sumWorkerAmount)}</dd>
                      </div>
                    </dl>
                  </header>
                  <div className="payments-tx-job-card__table-wrap">
                    <table className="mgmt-table payments-tx-table payments-tx-table--nested">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Worker</th>
                          <th>Line ₹</th>
                          <th>Payout</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(group.lineItems || []).map((p) => (
                          <tr key={p._id}>
                            <td>
                              <NavLink to={`/payments/transactions/${p._id}`} className="ph2-id-link">
                                {formatPaymentDisplayId(p)}
                              </NavLink>
                            </td>
                            <td>{p.workerId?.fullName || '—'}</td>
                            <td>{formatCurrencyTable(p.amount)}</td>
                            <td>
                              <span className={`mgmt-badge ${payoutStatusBadgeClass(p.payoutStatus)}`}>
                                {payoutStatusLabel(p.payoutStatus)}
                              </span>
                            </td>
                            <td>
                              <span className={`mgmt-badge ${paymentStatusBadgeClass(p.status)}`}>
                                {paymentStatusLabel(p.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
        <DataTable loading={loading} loadingMessage="Loading payments…" emptyColSpan={flatColSpan}>
          <table className="ph2-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Type</th>
                <th>Employer</th>
                <th>Worker</th>
                <th>Base amount</th>
                <th>Fee %</th>
                <th>Worker final</th>
                <th>Inflow</th>
                <th>Payout</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <TableEmptyRow colSpan={flatColSpan} message="No payments match these filters." />
              )}
              {rows.map((p) => (
                <tr key={p._id}>
                  <td>
                    <NavLink
                      to={`/payments/transactions/${p._id}`}
                      className="ph2-id-link"
                      title={String(p._id)}
                    >
                      {formatPaymentDisplayId(p)}
                    </NavLink>
                  </td>
                  <td>
                    <span className={paymentTypeClass(p.paymentType)}>{p.paymentType || '—'}</span>
                  </td>
                  <td>
                    <div className="ph2-cell-user">
                      <Avatar nameOrEmail={employerDisplayName(p)} />
                      <span className="ph2-cell-name">{employerDisplayName(p)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="ph2-cell-user">
                      <Avatar nameOrEmail={p.workerId?.fullName || p.workerId?.phoneNumber} />
                      <span className="ph2-cell-name">
                        {p.workerId?.fullName || p.workerId?.phoneNumber || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="ph2-amt">{formatCurrencyTable(p.amount)}</td>
                  <td>{feePercentLabel(p)}</td>
                  <td className="ph2-amt">{formatCurrencyTable(p.workerAmount)}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
        )}
        <div className="ph2-footer-row">
          <span>
            {pagination.total === 0
              ? 'Showing 0 payments'
              : `Showing ${((pagination.page - 1) * pagination.limit + 1).toLocaleString('en-IN')}–${Math.min(pagination.page * pagination.limit, pagination.total).toLocaleString('en-IN')} of ${pagination.total.toLocaleString('en-IN')} payments`}
          </span>
          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            limit={pagination.limit}
            onPrevious={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
            onNext={() => setPagination((p) => ({ ...p, page: Math.min(p.pages || 1, p.page + 1) }))}
          />
        </div>
      </section>

      <details className="payments-tx__panel payments-page__card" style={{ marginTop: '1.25rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Advanced filters (job / user ids, dates)</summary>
        <p className="ph2-muted" style={{ marginTop: 8 }}>
          Use MongoDB ids from URLs. Main search above also matches names and <code>PAY-YYYY-XXXX</code> references.
        </p>
        <LegacyAdvancedFilters />
      </details>
    </div>
  )
}

const PAYMENT_TYPE_FILTER_OPTIONS = [
    { value: '', label: 'All types' },
    { value: 'ONLINE', label: 'Online' },
    { value: 'CASH', label: 'Cash' },
]

/** Advanced filters — job id, date range, grouped layout */
function LegacyAdvancedFilters() {
  const {
    statusFilter,
    setStatusFilter,
    payoutFilter,
    setPayoutFilter,
    paymentTypeFilter,
    setPaymentTypeFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    jobIdFilter,
    setJobIdFilter,
    txViewMode,
    setTxViewMode,
    setPagination,
    fetchList,
  } = usePaymentsAdmin()

  return (
    <form
      className="payments-tx__filter-grid"
      style={{ marginTop: 12 }}
      onSubmit={(e) => {
        e.preventDefault()
        setPagination((p) => ({ ...p, page: 1 }))
        fetchList(1)
      }}
    >
      <div className="payments-tx__field payments-tx__field--full">
        <label htmlFor="adv-job" className="payments-tx__label">Job ID</label>
        <input
          id="adv-job"
          className="payments-tx__input"
          value={jobIdFilter}
          onChange={(e) => setJobIdFilter(e.target.value)}
          placeholder="24-character Mongo id"
        />
      </div>
      <div className="payments-tx__field">
        <label htmlFor="adv-pay-st" className="payments-tx__label">Payment status</label>
        <select
          id="adv-pay-st"
          className="payments-tx__select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPagination((p) => ({ ...p, page: 1 }))
          }}
        >
          {PAYMENT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || 'all-pay'} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="payments-tx__field">
        <label htmlFor="adv-po-st" className="payments-tx__label">Payout status</label>
        <select
          id="adv-po-st"
          className="payments-tx__select"
          value={payoutFilter}
          onChange={(e) => {
            setPayoutFilter(e.target.value)
            setPagination((p) => ({ ...p, page: 1 }))
          }}
        >
          {PAYOUT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || 'all-payout'} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="payments-tx__field">
        <label htmlFor="adv-pt" className="payments-tx__label">Payment type</label>
        <select
          id="adv-pt"
          className="payments-tx__select"
          value={paymentTypeFilter}
          onChange={(e) => {
            setPaymentTypeFilter(e.target.value)
            setPagination((p) => ({ ...p, page: 1 }))
          }}
        >
          {PAYMENT_TYPE_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value || 'all-types'} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="payments-tx__field">
        <label htmlFor="adv-from" className="payments-tx__label">Created from</label>
        <input
          id="adv-from"
          type="date"
          className="payments-tx__input"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value)
            setPagination((p) => ({ ...p, page: 1 }))
          }}
        />
      </div>
      <div className="payments-tx__field">
        <label htmlFor="adv-to" className="payments-tx__label">Created to</label>
        <input
          id="adv-to"
          type="date"
          className="payments-tx__input"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value)
            setPagination((p) => ({ ...p, page: 1 }))
          }}
        />
      </div>
      <div className="payments-tx__field payments-tx__field--full">
        <span className="payments-tx__label">Layout</span>
        <div className="payments-tx__view-toggle-btns">
          <button
            type="button"
            className={`payments-tx__seg${txViewMode !== 'grouped' ? ' payments-tx__seg--active' : ''}`}
            onClick={() => {
              setTxViewMode('flat')
              setPagination((p) => ({ ...p, page: 1 }))
            }}
          >
            All rows
          </button>
          <button
            type="button"
            className={`payments-tx__seg${txViewMode === 'grouped' ? ' payments-tx__seg--active' : ''}`}
            onClick={() => {
              setTxViewMode('grouped')
              setPagination((p) => ({ ...p, page: 1 }))
            }}
          >
            By job
          </button>
        </div>
      </div>
      <div className="payments-tx__field payments-tx__field--full">
        <button type="submit" className="payments-tx__apply">
          Apply advanced filters
        </button>
      </div>
    </form>
  )
}
