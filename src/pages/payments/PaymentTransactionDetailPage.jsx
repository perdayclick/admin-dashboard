import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { paymentApi } from '../../services/api'
import { getErrorMessage, formatAdminDateTime, initials } from '../../utils/format'
import { isMongoObjectIdString } from '../../utils/mongoId'
import {
  paymentStatusLabel,
  payoutStatusLabel,
  paymentStatusBadgeClass,
  payoutStatusBadgeClass,
  disputeStatusLabel,
  formatDisputeReason,
} from '../../constants/paymentEnums'
import { Alert, Button } from '../../components/ui'
import { usePaymentsAdmin } from './PaymentsAdminContext'
import {
  canRetryFailedOnlinePayout,
  formatCurrency,
  formatCurrencyTable,
  formatPaymentDisplayId,
  formatJobDisplayId,
  feePercentLabel,
  normalizeDisputeStatus,
} from './paymentsShared'

function TxDetailRow({ label, children, mono }) {
  return (
    <div className="payments-tx-detail__item">
      <span className="payments-tx-detail__label">{label}</span>
      <span className={`payments-tx-detail__value${mono ? ' payments-tx-detail__value--mono' : ''}`}>
        {children}
      </span>
    </div>
  )
}

function formatJobLocationShort(job) {
  if (!job || typeof job !== 'object') return '—'
  const loc = job.location
  if (!loc || typeof loc !== 'object') return '—'
  const bits = [loc.locality, loc.address, loc.landmark].filter((x) => x && String(x).trim())
  return bits.length ? bits.slice(0, 2).join(', ') : '—'
}

function employerDisplayName(job, user) {
  const e = job?.employerId
  if (e && typeof e === 'object') {
    const n = e.companyName || e.businessName || e.fullName || e.contactPersonName
    if (n) return String(n)
  }
  return user?.name || user?.phone || '—'
}

function headlineStatus(p) {
  if (p.status === 'captured' && p.payoutStatus === 'paid') return 'COMPLETED'
  if (p.status === 'refunded') return 'REFUNDED'
  if (p.status === 'failed') return 'FAILED'
  if (p.status === 'expired') return 'EXPIRED'
  if (p.status === 'underpaid') return 'UNDERPAID'
  if (p.status === 'captured') return 'CAPTURED'
  return String(paymentStatusLabel(p.status)).toUpperCase()
}

function headlineBadgeClass(p) {
  if (p.status === 'captured' && p.payoutStatus === 'paid') return 'mgmt-badge badge-success'
  if (p.status === 'captured') return 'mgmt-badge badge-success'
  if (p.status === 'failed' || p.status === 'expired' || p.status === 'refunded') {
    return 'mgmt-badge badge-secondary'
  }
  if (p.status === 'underpaid') return 'mgmt-badge badge-warning'
  return `mgmt-badge ${paymentStatusBadgeClass(p.status)}`
}

function CopyLine({ label, value }) {
  const [copied, setCopied] = useState(false)
  const display = value && String(value).trim() ? String(value) : '—'
  const copy = async () => {
    if (!value || display === '—') return
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="payments-tx-detail__copy-block">
      <span className="payments-tx-detail__label">{label}</span>
      <div className="payments-tx-detail__copy-row">
        <code className="payments-tx-detail__mono-line" title={display}>
          {display}
        </code>
        <button
          type="button"
          className="payments-tx-detail__copy-btn"
          onClick={copy}
          disabled={display === '—'}
          aria-label={`Copy ${label}`}
        >
          {copied ? (
            <span className="payments-tx-detail__copy-btn-text">Copied</span>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.24a2 2 0 00-.88-1.66l-3.24-2.16A2 2 0 0014.76 3H10a2 2 0 00-2 2z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M6 8H5a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

/**
 * Timeline from Payment fields: capture → wallet → payout arm → Razorpay result.
 * Each step includes `variant` for dot styling; `done` turns the segment below green.
 */
function buildTimelineSteps(p) {
  const st = p?.status || ''
  const ps = p?.payoutStatus || 'not_applicable'
  const payType = (p?.paymentType || 'ONLINE').toUpperCase() === 'CASH' ? 'CASH' : 'ONLINE'

  const hasCaptureSuccess = ['captured', 'refunded', 'underpaid'].includes(st)
  const captureFailed = ['failed', 'expired'].includes(st)
  const capturePending = ['initiated', 'pending'].includes(st)

  const initDone = Boolean(p?.createdAt)
  const initSub = initDone ? formatAdminDateTime(p.createdAt) : '—'

  let capDone = false
  let capSub = 'Pending'
  let capVariant = 'muted'
  if (hasCaptureSuccess) {
    capDone = true
    capVariant = 'success'
    if (st === 'captured') capSub = 'Completed'
    else if (st === 'refunded') capSub = 'Refunded'
    else capSub = 'Underpaid'
  } else if (captureFailed) {
    capSub = paymentStatusLabel(st)
    capVariant = 'danger'
  } else if (!capturePending && st) {
    capSub = paymentStatusLabel(st)
  }

  const walDone = Boolean(p.walletCredited) && hasCaptureSuccess
  const walSub = !hasCaptureSuccess
    ? captureFailed
      ? '—'
      : 'Pending'
    : walDone
      ? 'Completed'
      : 'Pending'
  const walVariant = !hasCaptureSuccess ? 'muted' : walDone ? 'success' : 'muted'

  const payoutArmed = ['pending', 'on_hold', 'processing', 'paid', 'failed', 'disputed'].includes(ps)
  const schedDone =
    hasCaptureSuccess &&
    payoutArmed &&
    (Boolean(p.payoutAt) ||
      ['processing', 'paid', 'failed', 'disputed'].includes(ps) ||
      (payType === 'CASH' && (ps === 'pending' || ps === 'on_hold')) ||
      (payType === 'ONLINE' && walDone && (ps === 'pending' || ps === 'on_hold')))

  let schedSub = 'Pending'
  let schedVariant = 'muted'
  if (schedDone) {
    if (p.payoutAt) schedSub = formatAdminDateTime(p.payoutAt)
    else if (ps === 'on_hold') schedSub = 'On hold'
    else if (ps === 'processing') schedSub = 'Processing'
    else if (ps === 'failed') schedSub = 'Failed'
    else if (ps === 'disputed') schedSub = 'Disputed'
    else schedSub = 'Completed'
    if (ps === 'failed') schedVariant = 'danger'
    else if (ps === 'disputed') schedVariant = 'warning'
    else schedVariant = 'success'
  }

  const relDone = ps === 'paid'
  let relSub = 'Pending'
  let relVariant = 'muted'
  if (ps === 'paid') {
    relSub = p.payoutAt ? formatAdminDateTime(p.payoutAt) : 'Completed'
    relVariant = 'success'
  } else if (ps === 'processing') {
    relSub = 'Processing'
    relVariant = 'warning'
  } else if (ps === 'failed') {
    relSub = 'Failed'
    relVariant = 'danger'
  } else if (ps === 'disputed') {
    relSub = 'Disputed'
    relVariant = 'warning'
  } else if (ps === 'on_hold' || ps === 'pending') {
    relSub = 'Pending'
    relVariant = 'muted'
  }

  return [
    {
      key: 'init',
      title: 'Payment Initiated',
      sub: initSub,
      done: initDone,
      variant: initDone ? 'success' : 'muted',
    },
    {
      key: 'cap',
      title: 'Order Captured',
      sub: capSub,
      done: capDone,
      variant: capVariant,
    },
    {
      key: 'wal',
      title: 'Wallet Credited',
      sub: walSub,
      done: walDone,
      variant: walVariant,
    },
    {
      key: 'sch',
      title: 'Payout Scheduled',
      sub: schedSub,
      done: schedDone,
      variant: schedVariant,
    },
    {
      key: 'rel',
      title: 'Payout Released',
      sub: relSub,
      done: relDone,
      variant: relVariant,
    },
  ]
}

export default function PaymentTransactionDetailPage() {
  const { paymentId } = useParams()
  const navigate = useNavigate()
  const {
    stats: s,
    disputeModal,
    disputeNotesModal,
    setDisputeModal,
    openDisputeNotesEditor,
    handleRetryOnePayout,
    retryingPaymentId,
    fetchStats,
  } = usePaymentsAdmin()

  const [payment, setPayment] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  const maxRetries = s?.retryHealth?.maxAutoRetries ?? 3

  const loadPayment = useCallback(async () => {
    if (!paymentId || !isMongoObjectIdString(paymentId)) {
      setLoadError('Invalid transaction id.')
      setPayment(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError('')
    try {
      const res = await paymentApi.getAdminPayment(paymentId)
      const row = res?.data ?? res
      setPayment(row && typeof row === 'object' ? row : null)
      if (!row) setLoadError('Payment not found.')
    } catch (err) {
      setPayment(null)
      setLoadError(getErrorMessage(err, 'Failed to load payment'))
    } finally {
      setLoading(false)
    }
  }, [paymentId])

  useEffect(() => {
    loadPayment()
  }, [loadPayment])

  const wasDisputeModal = useRef(false)
  useEffect(() => {
    if (wasDisputeModal.current && !disputeModal) loadPayment()
    wasDisputeModal.current = Boolean(disputeModal)
  }, [disputeModal, loadPayment])

  const wasNotesModal = useRef(false)
  useEffect(() => {
    if (wasNotesModal.current && !disputeNotesModal) loadPayment()
    wasNotesModal.current = Boolean(disputeNotesModal)
  }, [disputeNotesModal, loadPayment])

  const onRetryPayout = async () => {
    if (!payment?._id) return
    await handleRetryOnePayout(payment._id)
    await loadPayment()
    await fetchStats()
  }

  const workerRows = useMemo(() => {
    if (!payment) return []
    const raw = payment.jobWorkerPayments
    if (Array.isArray(raw) && raw.length > 0) {
      return [...raw].sort((a, b) => {
        const na = (a.workerId?.fullName || a.workerId?.phoneNumber || '').toString()
        const nb = (b.workerId?.fullName || b.workerId?.phoneNumber || '').toString()
        return na.localeCompare(nb)
      })
    }
    return [
      {
        _id: payment._id,
        workerId: payment.workerId,
        payoutStatus: payment.payoutStatus,
        workerAmount: payment.workerAmount,
        status: payment.status,
        amount: payment.amount,
        platformFee: payment.platformFee,
        currency: payment.currency,
        paymentType: payment.paymentType,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        razorpayPayoutId: payment.razorpayPayoutId,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
    ]
  }, [payment])

  const checkoutTotals = useMemo(() => {
    let base = 0
    let fee = 0
    let worker = 0
    for (const r of workerRows) {
      base += Number(r.amount) || 0
      fee += Number(r.platformFee) || 0
      worker += Number(r.workerAmount) || 0
    }
    return { base, fee, worker, count: workerRows.length }
  }, [workerRows])

  if (!paymentId || !isMongoObjectIdString(paymentId)) {
    return (
      <div className="payments-tx-detail payments-tx-detail--v2">
        <NavLink to="/payments/transactions" className="payments-tx-detail__back-v2">
          ← Back
        </NavLink>
        <Alert variant="error" className="mgmt-alert">Invalid transaction id.</Alert>
      </div>
    )
  }

  if (loading && !payment) {
    return (
      <div className="payments-tx-detail payments-tx-detail--v2">
        <NavLink to="/payments/transactions" className="payments-tx-detail__back-v2">
          ← Back
        </NavLink>
        <p className="payments-tx-detail__loading">Loading transaction…</p>
      </div>
    )
  }

  if (loadError && !payment) {
    return (
      <div className="payments-tx-detail payments-tx-detail--v2">
        <NavLink to="/payments/transactions" className="payments-tx-detail__back-v2">
          ← Back
        </NavLink>
        <Alert variant="error" className="mgmt-alert">{loadError}</Alert>
      </div>
    )
  }

  const p = payment
  const job = p?.jobId
  const jobRef = job && (job._id || job)
  const u = p?.user
  const disputeSt = normalizeDisputeStatus(p)
  const disputeOpen = disputeSt === 'open'
  const showPayoutRetry = p && canRetryFailedOnlinePayout(p, maxRetries)
  const ev = Array.isArray(p?.dispute?.evidence) ? p.dispute.evidence : []
  const metaObj = p?.metadata && typeof p.metadata === 'object' && !Array.isArray(p.metadata) ? p.metadata : null
  const feePct = feePercentLabel(p)
  const platformFeeStr =
    feePct && feePct !== '—' ? `Platform Fee (${feePct})` : 'Platform Fee'
  const negFee =
    p.platformFee != null && Number.isFinite(Number(p.platformFee)) && Number(p.platformFee) > 0
      ? `-${formatCurrencyTable(p.platformFee)}`
      : formatCurrencyTable(p.platformFee)
  const timelineSteps = buildTimelineSteps(p)
  const employerName = employerDisplayName(job, u)
  const isMultiCheckout = checkoutTotals.count > 1
  const totalPlatformFeeStr =
    feePct && feePct !== '—' ? `Total platform commission (${feePct} per worker base)` : 'Total platform commission'
  const totalNegFee =
    checkoutTotals.fee > 0 ? `-${formatCurrencyTable(checkoutTotals.fee)}` : formatCurrencyTable(checkoutTotals.fee)

  return (
    <div className="payments-tx-detail payments-tx-detail--v2">
      <NavLink to="/payments/transactions" className="payments-tx-detail__back-v2">
        ← Back
      </NavLink>

      <header className="payments-tx-detail__topbar">
        <div className="payments-tx-detail__topbar-main">
          <div className="payments-tx-detail__topbar-title-row">
            <h1 className="payments-tx-detail__tx-title">{formatPaymentDisplayId(p)}</h1>
            <span className={headlineBadgeClass(p)}>{headlineStatus(p)}</span>
          </div>
          {isMultiCheckout ? (
            <p className="payments-tx-detail__checkout-tagline">
              Same Razorpay checkout as {checkoutTotals.count} workers — totals below add every worker row; you can
              open any row’s payment id to see this full split.
            </p>
          ) : null}
        </div>
        <div className="payments-tx-detail__topbar-actions">
          {jobRef && (
            <Button variant="secondary" onClick={() => navigate(`/jobs/${jobRef}`)}>
              Open job
            </Button>
          )}
          {disputeOpen && (
            <Button
              variant="secondary"
              onClick={() => setDisputeModal({ payment: p, disputeStatus: 'resolved_worker' })}
            >
              Resolve dispute
            </Button>
          )}
          {!disputeOpen && disputeSt && disputeSt !== 'none' && (
            <Button variant="secondary" onClick={() => openDisputeNotesEditor(p)}>
              Edit dispute notes
            </Button>
          )}
          {showPayoutRetry && (
            <Button variant="secondary" onClick={onRetryPayout} disabled={retryingPaymentId === p._id}>
              {retryingPaymentId === p._id ? 'Retrying…' : 'Retry payout'}
            </Button>
          )}
        </div>
      </header>

      <div className="payments-tx-detail__split">
        <div className="payments-tx-detail__main-col">
          <section className="payments-tx-detail__card payments-page__card">
            <h2 className="payments-tx-detail__card-title">Core References</h2>
            <div className="payments-tx-detail__core-grid">
              <div>
                <span className="payments-tx-detail__label">Job ID</span>
                <div className="payments-tx-detail__value">
                  {jobRef ? (
                    <NavLink to={`/jobs/${jobRef}`} className="payments-tx-detail__link-strong">
                      {formatJobDisplayId(job)}
                    </NavLink>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
              <div>
                <span className="payments-tx-detail__label">Location</span>
                <div className="payments-tx-detail__value">{formatJobLocationShort(job)}</div>
              </div>
              <div className="payments-tx-detail__core-span-2">
                <span className="payments-tx-detail__label">Employer</span>
                <div className="payments-tx-detail__party-row">
                  <span className="payments-tx-detail__avatar payments-tx-detail__avatar--employer" aria-hidden="true">
                    {initials(employerName)}
                  </span>
                  <span className="payments-tx-detail__party-name">{employerName}</span>
                </div>
              </div>
              <div className="payments-tx-detail__core-span-2">
                <span className="payments-tx-detail__label">Workers</span>
                <div className="payments-tx-detail__worker-stack">
                  {workerRows.map((row) => {
                    const wk = row.workerId
                    const wid = wk?._id || wk
                    const wname = wk?.fullName || wk?.phoneNumber || (wid ? String(wid) : '—')
                    return (
                      <div key={String(row._id)} className="payments-tx-detail__party-row">
                        <span className="payments-tx-detail__avatar payments-tx-detail__avatar--worker" aria-hidden="true">
                          {initials(wname)}
                        </span>
                        {wid ? (
                          <NavLink to={`/workers/${wid}`} className="payments-tx-detail__link-strong">
                            {wname}
                          </NavLink>
                        ) : (
                          <span className="payments-tx-detail__party-name">{wname}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="payments-tx-detail__card payments-page__card">
            <h2 className="payments-tx-detail__card-title">Amount Breakdown</h2>
            {isMultiCheckout ? (
              <>
                <p className="payments-tx-detail__checkout-hint">
                  Employer paid one order for this job; the backend stores one payment document per worker with the
                  same split (base, commission, net to worker) unless amounts differ per row.
                </p>
                <div className="payments-tx-detail__amount-list">
                  <div className="payments-tx-detail__amount-row">
                    <span>Total employer base ({checkoutTotals.count} workers)</span>
                    <span>{formatCurrencyTable(checkoutTotals.base)}</span>
                  </div>
                  <div className="payments-tx-detail__amount-row">
                    <span>{totalPlatformFeeStr}</span>
                    <span className="payments-tx-detail__amount-neg">{totalNegFee}</span>
                  </div>
                  <div className="payments-tx-detail__amount-row payments-tx-detail__amount-row--final">
                    <span className="payments-tx-detail__amount-final-label">Total to workers (net)</span>
                    <span className="payments-tx-detail__amount-final-value">
                      {formatCurrencyTable(checkoutTotals.worker)}
                    </span>
                  </div>
                </div>
                <p className="payments-tx-detail__amount-subhead">This payment row ({formatPaymentDisplayId(p)})</p>
                <div className="payments-tx-detail__amount-list">
                  <div className="payments-tx-detail__amount-row">
                    <span>Base (this worker)</span>
                    <span>{formatCurrencyTable(p.amount)}</span>
                  </div>
                  <div className="payments-tx-detail__amount-row">
                    <span>{platformFeeStr}</span>
                    <span className="payments-tx-detail__amount-neg">{negFee}</span>
                  </div>
                  <div className="payments-tx-detail__amount-row payments-tx-detail__amount-row--final">
                    <span className="payments-tx-detail__amount-final-label">Worker final (this row)</span>
                    <span className="payments-tx-detail__amount-final-value">{formatCurrencyTable(p.workerAmount)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="payments-tx-detail__amount-list">
                <div className="payments-tx-detail__amount-row">
                  <span>Base Amount</span>
                  <span>{formatCurrencyTable(p.amount)}</span>
                </div>
                <div className="payments-tx-detail__amount-row">
                  <span>{platformFeeStr}</span>
                  <span className="payments-tx-detail__amount-neg">{negFee}</span>
                </div>
                <div className="payments-tx-detail__amount-row payments-tx-detail__amount-row--final">
                  <span className="payments-tx-detail__amount-final-label">Worker Final Amount</span>
                  <span className="payments-tx-detail__amount-final-value">{formatCurrencyTable(p.workerAmount)}</span>
                </div>
              </div>
            )}
          </section>

          {isMultiCheckout ? (
            <section className="payments-tx-detail__card payments-page__card">
              <h2 className="payments-tx-detail__card-title">Per-worker payment</h2>
              <p className="payments-tx-detail__checkout-hint">
                Each worker has their own transaction id, payout status, and Razorpay payout id; collection (order /
                payment id) is shared for the whole checkout.
              </p>
              <div className="payments-tx-detail__worker-pay-cards">
                {workerRows.map((row) => {
                  const wk = row.workerId
                  const wid = wk?._id || wk
                  const wname = wk?.fullName || wk?.phoneNumber || (wid ? String(wid) : 'Worker')
                  const isCurrent = String(row._id) === String(p._id)
                  const rowFee =
                    row.platformFee != null && Number(row.platformFee) > 0
                      ? `-${formatCurrencyTable(row.platformFee)}`
                      : formatCurrencyTable(row.platformFee)
                  return (
                    <article
                      key={String(row._id)}
                      className={`payments-tx-detail__worker-pay-card${isCurrent ? ' payments-tx-detail__worker-pay-card--current' : ''}`}
                    >
                      <div className="payments-tx-detail__worker-pay-card-head">
                        <div className="payments-tx-detail__worker-pay-card-who">
                          <span className="payments-tx-detail__avatar payments-tx-detail__avatar--worker" aria-hidden="true">
                            {initials(wname)}
                          </span>
                          <div>
                            <span className="payments-tx-detail__label">Worker</span>
                            <div className="payments-tx-detail__worker-pay-name">
                              {wid ? (
                                <NavLink to={`/workers/${wid}`} className="payments-tx-detail__link-strong">
                                  {wname}
                                </NavLink>
                              ) : (
                                wname
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="payments-tx-detail__worker-pay-card-ids">
                          <span className="payments-tx-detail__label">Transaction</span>
                          <div className="payments-tx-detail__worker-pay-tx-id">{formatPaymentDisplayId(row)}</div>
                          {isCurrent ? (
                            <span className="payments-tx-detail__worker-pay-current-pill">Viewing</span>
                          ) : (
                            <NavLink
                              to={`/payments/transactions/${row._id}`}
                              className="payments-tx-detail__subtle-link"
                            >
                              Open this row
                            </NavLink>
                          )}
                        </div>
                      </div>
                      <div className="payments-tx-detail__worker-pay-amounts">
                        <div>
                          <span className="payments-tx-detail__label">Base</span>
                          <div className="payments-tx-detail__worker-pay-amt">{formatCurrencyTable(row.amount)}</div>
                        </div>
                        <div>
                          <span className="payments-tx-detail__label">Commission</span>
                          <div className="payments-tx-detail__worker-pay-amt payments-tx-detail__amount-neg">
                            {rowFee}
                          </div>
                        </div>
                        <div>
                          <span className="payments-tx-detail__label">Net to worker</span>
                          <div className="payments-tx-detail__worker-pay-amt payments-tx-detail__amount-final-value">
                            {formatCurrencyTable(row.workerAmount)}
                          </div>
                        </div>
                      </div>
                      <div className="payments-tx-detail__worker-pay-badges">
                        <span className={`mgmt-badge ${paymentStatusBadgeClass(row.status)}`}>
                          {String(paymentStatusLabel(row.status)).toUpperCase()}
                        </span>
                        <span className={`mgmt-badge ${payoutStatusBadgeClass(row.payoutStatus)}`}>
                          {String(payoutStatusLabel(row.payoutStatus)).toUpperCase()}
                        </span>
                      </div>
                      {row.razorpayPayoutId ? (
                        <div className="payments-tx-detail__worker-pay-payout">
                          <CopyLine label="Razorpay payout ID" value={row.razorpayPayoutId} />
                        </div>
                      ) : (
                        <p className="payments-tx-detail__checkout-hint">No Razorpay payout id yet for this row.</p>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          ) : null}

          <section className="payments-tx-detail__card payments-page__card">
            <h2 className="payments-tx-detail__card-title">Payment Type &amp; Method</h2>
            <div className="payments-tx-detail__paytype-grid">
              <div>
                <span className="payments-tx-detail__label">Type</span>
                <div>
                  <span className="payments-tx-detail__type-pill">{(p.paymentType || '—').toUpperCase()}</span>
                </div>
              </div>
              <div>
                <span className="payments-tx-detail__label">Transaction date</span>
                <div className="payments-tx-detail__value">{formatAdminDateTime(p.createdAt)}</div>
              </div>
              <div>
                <span className="payments-tx-detail__label">Currency</span>
                <div className="payments-tx-detail__value">{p.currency || 'INR'}</div>
              </div>
              <div>
                <span className="payments-tx-detail__label">Payment method</span>
                <div className="payments-tx-detail__value">{p.paymentMethod || '—'}</div>
              </div>
            </div>
          </section>

          <section className="payments-tx-detail__card payments-page__card">
            <h2 className="payments-tx-detail__card-title">Razorpay IDs</h2>
            {isMultiCheckout ? (
              <p className="payments-tx-detail__checkout-hint">
                Order and payment ids are shared for the whole checkout. Each worker has a separate payout id — see
                Per-worker payment.
              </p>
            ) : null}
            <div className="payments-tx-detail__razorpay-stack">
              <CopyLine label="Order ID" value={p.razorpayOrderId} />
              <CopyLine label="Payment ID" value={p.razorpayPaymentId} />
              {!isMultiCheckout && p.razorpayPayoutId ? <CopyLine label="Payout ID" value={p.razorpayPayoutId} /> : null}
              {isMultiCheckout && p.razorpayPayoutId ? (
                <CopyLine label="Payout ID (this worker row)" value={p.razorpayPayoutId} />
              ) : null}
            </div>
          </section>

          <section className="payments-tx-detail__card payments-page__card">
            <h2 className="payments-tx-detail__card-title">Employer payment status</h2>
            <div className="payments-tx-detail__status-line">
              <span className={`mgmt-badge ${paymentStatusBadgeClass(p.status)}`}>
                {String(paymentStatusLabel(p.status)).toUpperCase()}
              </span>
            </div>
            {isMultiCheckout ? (
              <p className="payments-tx-detail__checkout-hint">
                Razorpay collection status is the same for every worker row tied to this order (verify updates all rows
                together).
              </p>
            ) : null}
          </section>

          {!isMultiCheckout ? (
            <section className="payments-tx-detail__card payments-page__card">
              <h2 className="payments-tx-detail__card-title">Worker payout status</h2>
              <ul className="payments-tx-detail__payout-list">
                {workerRows.map((row) => {
                  const wk = row.workerId
                  const wid = wk?._id || wk
                  const wname = wk?.fullName || wk?.phoneNumber || (wid ? String(wid) : 'Worker')
                  return (
                    <li key={String(row._id)} className="payments-tx-detail__payout-row">
                      <div className="payments-tx-detail__payout-name">
                        {wid ? (
                          <NavLink to={`/workers/${wid}`} className="payments-tx-detail__link-strong">
                            {wname}
                          </NavLink>
                        ) : (
                          wname
                        )}
                        {String(row._id) !== String(p._id) && (
                          <NavLink
                            to={`/payments/transactions/${row._id}`}
                            className="payments-tx-detail__subtle-link"
                          >
                            View row
                          </NavLink>
                        )}
                      </div>
                      <span className={`mgmt-badge ${payoutStatusBadgeClass(row.payoutStatus)}`}>
                        {String(payoutStatusLabel(row.payoutStatus)).toUpperCase()}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          <section className="payments-tx-detail__card payments-page__card">
            <h2 className="payments-tx-detail__card-title">Collection &amp; payout details</h2>
            {isMultiCheckout ? (
              <p className="payments-tx-detail__checkout-hint">
                Fields below are for the payment row you opened; payout timing and retries can differ per worker.
              </p>
            ) : null}
            <div className="payments-tx-detail__grid">
              <TxDetailRow label="Retry count (checkout)">{p.retryCount ?? 0}</TxDetailRow>
              <TxDetailRow label="Failure reason">{p.failureReason || '—'}</TxDetailRow>
              <TxDetailRow label="Amount verified">{p.amountVerified ? 'Yes' : 'No'}</TxDetailRow>
              <TxDetailRow label="Underpaid amount">{formatCurrency(p.underpaidAmount)}</TxDetailRow>
              <TxDetailRow label="Wallet credited">{p.walletCredited ? 'Yes' : 'No'}</TxDetailRow>
              <TxDetailRow label="Payout at">
                {p.payoutAt ? formatAdminDateTime(p.payoutAt) : '—'}
              </TxDetailRow>
              <TxDetailRow label="Payout retry count">{p.payoutRetryCount ?? 0}</TxDetailRow>
              <TxDetailRow label="Payout failure reason">{p.payoutFailureReason || '—'}</TxDetailRow>
            </div>
          </section>

          {disputeSt && disputeSt !== 'none' && (
            <section className="payments-tx-detail__card payments-page__card">
              <h2 className="payments-tx-detail__card-title">Dispute</h2>
              <div className="payments-tx-detail__grid">
                <TxDetailRow label="Status" mono>{disputeStatusLabel(p.dispute)}</TxDetailRow>
                <TxDetailRow label="Reason">{formatDisputeReason(p.dispute?.reason)}</TxDetailRow>
                <TxDetailRow label="Raised at">
                  {p.dispute?.raisedAt ? formatAdminDateTime(p.dispute.raisedAt) : '—'}
                </TxDetailRow>
                <TxDetailRow label="Auto-release at">
                  {p.dispute?.autoReleaseAt ? formatAdminDateTime(p.dispute.autoReleaseAt) : '—'}
                </TxDetailRow>
                <TxDetailRow label="Resolved at">
                  {p.dispute?.resolvedAt ? formatAdminDateTime(p.dispute.resolvedAt) : '—'}
                </TxDetailRow>
                <TxDetailRow label="Admin notes">{p.dispute?.resolutionNotes || '—'}</TxDetailRow>
                <TxDetailRow label="Evidence">
                  {ev.length === 0 ? '—' : (
                    <ul className="payments-tx-detail__evidence">
                      {ev.map((url) => (
                        <li key={url}>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="payments-tx-detail__link">
                            {url.length > 64 ? `${url.slice(0, 64)}…` : url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </TxDetailRow>
              </div>
            </section>
          )}

          {metaObj && Object.keys(metaObj).length > 0 && (
            <details className="payments-tx-detail__card payments-page__card payments-tx-detail__accordion">
              <summary className="payments-tx-detail__accordion-summary">
                <span className="payments-tx-detail__card-title payments-tx-detail__accordion-title">Metadata</span>
              </summary>
              <div className="payments-tx-detail__grid payments-tx-detail__accordion-body">
                {Object.entries(metaObj).map(([k, v]) => (
                  <TxDetailRow key={k} label={k} mono>
                    {String(v)}
                  </TxDetailRow>
                ))}
              </div>
            </details>
          )}

          <section className="payments-tx-detail__card payments-page__card payments-tx-detail__card--muted">
            <h2 className="payments-tx-detail__card-title">Timestamps</h2>
            <div className="payments-tx-detail__grid">
              <TxDetailRow label="Created">{formatAdminDateTime(p.createdAt)}</TxDetailRow>
              <TxDetailRow label="Updated">{formatAdminDateTime(p.updatedAt)}</TxDetailRow>
              <TxDetailRow label="Internal ID" mono>
                <span title={String(p._id)}>{String(p._id)}</span>
              </TxDetailRow>
            </div>
          </section>
        </div>

        <aside className="payments-tx-detail__aside">
          <section className="payments-tx-detail__card payments-page__card payments-tx-detail__timeline-card">
            <h2 className="payments-tx-detail__card-title">Status Timeline</h2>
            <ol className="payments-tx-detail__timeline">
              {timelineSteps.map((step, idx) => {
                const isCurrent =
                  !step.done &&
                  (idx === 0 || timelineSteps[idx - 1]?.done === true)
                return (
                  <li
                    key={step.key}
                    className="payments-tx-detail__timeline-item"
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {idx < timelineSteps.length - 1 ? (
                      <span
                        className={`payments-tx-detail__timeline-line${step.done ? ' payments-tx-detail__timeline-line--complete' : ''}`}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span
                      className={`payments-tx-detail__timeline-dot payments-tx-detail__timeline-dot--${step.variant}`}
                      aria-hidden="true"
                    />
                    <div className="payments-tx-detail__timeline-text">
                      <div className="payments-tx-detail__timeline-title">{step.title}</div>
                      <div className="payments-tx-detail__timeline-sub">{step.sub}</div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  )
}
