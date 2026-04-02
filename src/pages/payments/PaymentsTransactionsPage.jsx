import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  PAYMENT_STATUS_OPTIONS,
  PAYOUT_STATUS_OPTIONS,
  paymentStatusLabel,
  paymentStatusBadgeClass,
  disputeStatusLabel,
} from '../../constants/paymentEnums'
import {
  DataTable,
  TableEmptyRow,
  Pagination,
  Button,
} from '../../components/ui'
import { usePaymentsAdmin } from './PaymentsAdminContext'
import { formatCurrency } from './paymentsShared'

function shortenTxId(id) {
  const s = String(id)
  if (s.length <= 14) return s
  return `${s.slice(0, 6)}…${s.slice(-4)}`
}

export default function PaymentsTransactionsPage() {
  const {
    stats: s,
    rows,
    pagination,
    setPagination,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    payoutFilter,
    setPayoutFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    jobIdFilter,
    setJobIdFilter,
    fetchList,
    triggerLoading,
    retryFailedLoading,
    handleRetryFailedPayoutsBatch,
    handleTriggerPayouts,
  } = usePaymentsAdmin()

  const openDisputesOnPage = rows.filter((r) => r.dispute?.status === 'open').length
  const retriable = s?.retryHealth?.retriableFailedCount ?? 0

  useEffect(() => {
    fetchList(pagination.page)
  }, [fetchList, pagination.page])

  const applyJobFilter = (e) => {
    e.preventDefault()
    setPagination((p) => ({ ...p, page: 1 }))
    fetchList(1)
  }

  return (
    <div className="payments-tx">
      <header className="payments-tx__hero">
        <div className="payments-tx__hero-text">
          <p className="payments-tx__eyebrow">Ledger</p>
          <h1 className="payments-tx__title">Transactions</h1>
          <p className="payments-tx__lede">
            Filter the list, then open a <strong>transaction id</strong> for the full breakdown — job, worker, Razorpay, payout, and dispute tools live on the detail page.
          </p>
        </div>
        <div className="payments-tx__hero-aside">
          <button
            type="button"
            className="payments-tx__btn-primary"
            onClick={() => fetchList(pagination.page)}
            disabled={loading}
          >
            {loading ? 'Loading…' : '↻ Reload list'}
          </button>
          <NavLink to="/payments/payouts" className="payments-tx__nav-pill">
            Payout & cron →
          </NavLink>
        </div>
      </header>

      <div className="payments-tx__kpi-strip">
        <div className="payments-tx__kpi">
          <span className="payments-tx__kpi-label">Matching filter</span>
          <span className="payments-tx__kpi-value">
            {loading ? '…' : pagination.total.toLocaleString('en-IN')}
          </span>
          <span className="payments-tx__kpi-hint">total rows</span>
        </div>
        <div className={`payments-tx__kpi${openDisputesOnPage > 0 ? ' payments-tx__kpi--warn' : ''}`}>
          <span className="payments-tx__kpi-label">Open disputes</span>
          <span className="payments-tx__kpi-value">
            {loading ? '…' : openDisputesOnPage.toLocaleString('en-IN')}
          </span>
          <span className="payments-tx__kpi-hint">on this page</span>
        </div>
        <div className="payments-tx__kpi">
          <span className="payments-tx__kpi-label">Page</span>
          <span className="payments-tx__kpi-value">
            {loading ? '…' : `${pagination.page} / ${Math.max(1, pagination.pages || 1)}`}
          </span>
          <span className="payments-tx__kpi-hint">{pagination.limit} per page</span>
        </div>
      </div>

      <section className="payments-tx__panel payments-page__card" aria-labelledby="tx-filters-title">
        <div className="payments-tx__panel-head">
          <h2 id="tx-filters-title" className="payments-tx__panel-title">Filters</h2>
          <div className="payments-tx__quick-actions">
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
            <Button
              variant="secondary"
              onClick={handleTriggerPayouts}
              disabled={triggerLoading || retryFailedLoading}
            >
              {triggerLoading ? 'Running…' : 'Run payout job'}
            </Button>
          </div>
        </div>

        <form className="payments-tx__filter-grid" onSubmit={applyJobFilter}>
          <div className="payments-tx__field payments-tx__field--full">
            <label htmlFor="tx-job-id" className="payments-tx__label">Job ID (MongoDB)</label>
            <div className="payments-tx__job-row">
              <input
                id="tx-job-id"
                type="search"
                className="payments-tx__input"
                placeholder="Paste 24-character job id…"
                value={jobIdFilter}
                onChange={(e) => setJobIdFilter(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="payments-tx__apply">
                Apply
              </button>
            </div>
          </div>
          <div className="payments-tx__field">
            <label htmlFor="tx-pay-status" className="payments-tx__label">Payment status</label>
            <select
              id="tx-pay-status"
              className="payments-tx__select"
              aria-label="Payment status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })) }}
            >
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || 'all-pay'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="payments-tx__field">
            <label htmlFor="tx-payout-status" className="payments-tx__label">Payout status</label>
            <select
              id="tx-payout-status"
              className="payments-tx__select"
              aria-label="Payout status"
              value={payoutFilter}
              onChange={(e) => { setPayoutFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })) }}
            >
              {PAYOUT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || 'all-payout'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="payments-tx__field">
            <label htmlFor="tx-from" className="payments-tx__label">Created from</label>
            <input
              id="tx-from"
              type="date"
              className="payments-tx__input"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPagination((p) => ({ ...p, page: 1 })) }}
            />
          </div>
          <div className="payments-tx__field">
            <label htmlFor="tx-to" className="payments-tx__label">Created to</label>
            <input
              id="tx-to"
              type="date"
              className="payments-tx__input"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPagination((p) => ({ ...p, page: 1 })) }}
            />
          </div>
        </form>
      </section>

      <section className="payments-tx__table-shell">
        <p className="payments-tx__table-hint">
          Click a transaction id to open the full detail page (Razorpay ids, payout, disputes, actions).
        </p>
        <DataTable loading={loading} loadingMessage="Loading payments…" emptyColSpan={5}>
          <table className="mgmt-table payments-tx-table payments-tx-table--compact">
            <thead>
              <tr>
                <th>Transaction id</th>
                <th>Amount</th>
                <th>Platform fee</th>
                <th>Status</th>
                <th>Dispute</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && !error && (
                <TableEmptyRow colSpan={5} message="No payments match these filters." />
              )}
              {rows.map((p) => (
                <tr key={p._id} className="payments-tx-table__row">
                  <td>
                    <NavLink
                      to={`/payments/transactions/${p._id}`}
                      className="payments-tx-table__id-link"
                      title={String(p._id)}
                    >
                      {shortenTxId(p._id)}
                    </NavLink>
                  </td>
                  <td className="payments-tx-table__amount">{formatCurrency(p.amount)}</td>
                  <td className="payments-tx-table__muted">{formatCurrency(p.platformFee)}</td>
                  <td>
                    <span className={`mgmt-badge ${paymentStatusBadgeClass(p.status)}`}>
                      {paymentStatusLabel(p.status)}
                    </span>
                  </td>
                  <td className="payments-tx-table__dispute">{disputeStatusLabel(p.dispute)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>

        <div className="payments-tx__pager">
          <Pagination
            page={pagination.page} pages={pagination.pages}
            total={pagination.total} limit={pagination.limit}
            onPrevious={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
            onNext={() => setPagination((p) => ({ ...p, page: Math.min(p.pages || 1, p.page + 1) }))}
          />
        </div>
      </section>
    </div>
  )
}
