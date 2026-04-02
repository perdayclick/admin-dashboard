import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { paymentApi } from '../../services/api'
import { getErrorMessage, formatAdminDateTime } from '../../utils/format'
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

function SectionCard({ title, children }) {
  return (
    <section className="payments-tx-detail__card payments-page__card">
      <h2 className="payments-tx-detail__card-title">{title}</h2>
      <div className="payments-tx-detail__grid">
        {children}
      </div>
    </section>
  )
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

  if (!paymentId || !isMongoObjectIdString(paymentId)) {
    return (
      <div className="payments-tx-detail">
        <NavLink to="/payments/transactions" className="payments-tx-detail__back">← Transactions</NavLink>
        <Alert variant="error" className="mgmt-alert">Invalid transaction id.</Alert>
      </div>
    )
  }

  if (loading && !payment) {
    return (
      <div className="payments-tx-detail">
        <NavLink to="/payments/transactions" className="payments-tx-detail__back">← Transactions</NavLink>
        <p className="payments-tx-detail__loading">Loading transaction…</p>
      </div>
    )
  }

  if (loadError && !payment) {
    return (
      <div className="payments-tx-detail">
        <NavLink to="/payments/transactions" className="payments-tx-detail__back">← Transactions</NavLink>
        <Alert variant="error" className="mgmt-alert">{loadError}</Alert>
      </div>
    )
  }

  const p = payment
  const job = p?.jobId
  const jobRef = job && (job._id || job)
  const jobTitle = job?.jobTitle || '—'
  const w = p?.workerId
  const wid = w?._id || w
  const u = p?.user
  const disputeSt = normalizeDisputeStatus(p)
  const disputeOpen = disputeSt === 'open'
  const showPayoutRetry = p && canRetryFailedOnlinePayout(p, maxRetries)
  const ev = Array.isArray(p?.dispute?.evidence) ? p.dispute.evidence : []
  const metaObj = p?.metadata && typeof p.metadata === 'object' && !Array.isArray(p.metadata) ? p.metadata : null

  return (
    <div className="payments-tx-detail">
      <header className="payments-tx-detail__header">
        <NavLink to="/payments/transactions" className="payments-tx-detail__back">← Transactions</NavLink>
        <div className="payments-tx-detail__head-main">
          <p className="payments-tx-detail__eyebrow">Transaction</p>
          <h1 className="payments-tx-detail__title">Payment detail</h1>
          <code className="payments-tx-detail__id-full" title={String(p._id)}>{String(p._id)}</code>
        </div>
        <div className="payments-tx-detail__actions">
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

      <div className="payments-tx-detail__summary">
        <div className="payments-tx-detail__pill">
          <span className="payments-tx-detail__pill-label">Amount</span>
          <span className="payments-tx-detail__pill-value">{formatCurrency(p.amount)}</span>
        </div>
        <div className="payments-tx-detail__pill">
          <span className="payments-tx-detail__pill-label">Platform fee</span>
          <span className="payments-tx-detail__pill-value">{formatCurrency(p.platformFee)}</span>
        </div>
        <div className="payments-tx-detail__pill">
          <span className="payments-tx-detail__pill-label">Worker gets</span>
          <span className="payments-tx-detail__pill-value payments-tx-detail__pill-value--success">
            {formatCurrency(p.workerAmount)}
          </span>
        </div>
        <div className="payments-tx-detail__pill">
          <span className="payments-tx-detail__pill-label">Payment status</span>
          <span className={`mgmt-badge ${paymentStatusBadgeClass(p.status)}`}>
            {paymentStatusLabel(p.status)}
          </span>
        </div>
        <div className="payments-tx-detail__pill">
          <span className="payments-tx-detail__pill-label">Payout</span>
          <span className={`mgmt-badge ${payoutStatusBadgeClass(p.payoutStatus)}`}>
            {payoutStatusLabel(p.payoutStatus)}
          </span>
        </div>
        <div className="payments-tx-detail__pill">
          <span className="payments-tx-detail__pill-label">Dispute</span>
          <span className="payments-tx-detail__pill-mono">{disputeStatusLabel(p.dispute)}</span>
        </div>
      </div>

      <SectionCard title="Parties and links">
        <TxDetailRow label="Employer (user)">
          {u?.phone || u?.name || '—'}
        </TxDetailRow>
        <TxDetailRow label="Worker">
          {wid ? (
            <NavLink to={`/workers/${wid}`} className="payments-tx-detail__link">
              {w?.fullName || w?.phoneNumber || String(wid)}
            </NavLink>
          ) : '—'}
        </TxDetailRow>
        <TxDetailRow label="Job">
          {jobRef ? (
            <NavLink to={`/jobs/${jobRef}`} className="payments-tx-detail__link">{jobTitle}</NavLink>
          ) : jobTitle}
        </TxDetailRow>
        <TxDetailRow label="Payment type" mono>
          {p.paymentType || '—'}
        </TxDetailRow>
        <TxDetailRow label="Currency" mono>{p.currency || '—'}</TxDetailRow>
      </SectionCard>

      <SectionCard title="Razorpay (collection)">
        <TxDetailRow label="Order id" mono>{p.razorpayOrderId || '—'}</TxDetailRow>
        <TxDetailRow label="Payment id" mono>{p.razorpayPaymentId || '—'}</TxDetailRow>
        <TxDetailRow label="Payment method" mono>{p.paymentMethod || '—'}</TxDetailRow>
        <TxDetailRow label="Retry count (checkout)">{p.retryCount ?? 0}</TxDetailRow>
        <TxDetailRow label="Failure reason">{p.failureReason || '—'}</TxDetailRow>
        <TxDetailRow label="Amount verified">{p.amountVerified ? 'Yes' : 'No'}</TxDetailRow>
        <TxDetailRow label="Underpaid amount">{formatCurrency(p.underpaidAmount)}</TxDetailRow>
        <TxDetailRow label="Wallet credited">{p.walletCredited ? 'Yes' : 'No'}</TxDetailRow>
      </SectionCard>

      <SectionCard title="Payout (worker)">
        <TxDetailRow label="Payout at">
          {p.payoutAt ? formatAdminDateTime(p.payoutAt) : '—'}
        </TxDetailRow>
        <TxDetailRow label="Razorpay payout id" mono>{p.razorpayPayoutId || '—'}</TxDetailRow>
        <TxDetailRow label="Payout retry count">{p.payoutRetryCount ?? 0}</TxDetailRow>
        <TxDetailRow label="Payout failure reason">{p.payoutFailureReason || '—'}</TxDetailRow>
      </SectionCard>

      <SectionCard title="Dispute">
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
      </SectionCard>

      {metaObj && Object.keys(metaObj).length > 0 && (
        <SectionCard title="Metadata">
          {Object.entries(metaObj).map(([k, v]) => (
            <TxDetailRow key={k} label={k} mono>
              {String(v)}
            </TxDetailRow>
          ))}
        </SectionCard>
      )}

      <SectionCard title="Timestamps">
        <TxDetailRow label="Created">{formatAdminDateTime(p.createdAt)}</TxDetailRow>
        <TxDetailRow label="Updated">{formatAdminDateTime(p.updatedAt)}</TxDetailRow>
      </SectionCard>
    </div>
  )
}
