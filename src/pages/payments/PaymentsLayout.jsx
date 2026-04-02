import { Outlet, useLocation } from 'react-router-dom'
import { DISPUTE_RESOLVE_OUTCOME_OPTIONS, formatDisputeReason } from '../../constants/paymentEnums'
import { Alert, Button } from '../../components/ui'
import ConfirmModal from '../../components/ConfirmModal'
import { formatAdminDateTime } from '../../utils/format'
import { PaymentsAdminProvider, usePaymentsAdmin } from './PaymentsAdminContext'
import { C, resolveOutcomeHint } from './paymentsShared'
import '../../styles/ManagementPage.css'

function PaymentsLayoutInner() {
  const {
    stats: s,
    statsLoading,
    statsError,
    fetchStats,
    error,
    success,
    triggerLoading,
    retryFailedLoading,
    handleRetryFailedPayoutsBatch,
    handleTriggerPayouts,
    disputeModal,
    setDisputeModal,
    disputeLoading,
    disputeResolutionNotes,
    setDisputeResolutionNotes,
    disputeNotesModal,
    setDisputeNotesModal,
    disputeNotesDraft,
    setDisputeNotesDraft,
    disputeNotesLoading,
    confirmResolveDispute,
    saveDisputeNotes,
  } = usePaymentsAdmin()

  const { pathname } = useLocation()
  const hideFinanceChrome =
    pathname === '/payments/overview'
    || pathname === '/payments'
    || pathname.startsWith('/payments/transactions')
    || pathname.startsWith('/payments/payouts')
    || pathname.startsWith('/payments/disputes')

  const hasRetryAlert = s && s.retryHealth?.retriableFailedCount > 0
  const maxRetries = s?.retryHealth?.maxAutoRetries ?? 3
  const disputeResolvePay = disputeModal?.payment
  const disputeResolveJob = disputeResolvePay?.jobId
  const disputeResolveWorker = disputeResolvePay?.workerId
  const disputeResolveEvidence = Array.isArray(disputeResolvePay?.dispute?.evidence)
    ? disputeResolvePay.dispute.evidence
    : []

  /** Avoid showing payout batch toasts on Disputes — those actions live under Payouts / masthead. */
  const payoutOnlySuccess =
    !!success
    && /Payout run finished|Failed payout retry batch|Payout re-submitted/i.test(success)
  const showSuccessBanner =
    !!success
    && !(
      pathname.startsWith('/payments/disputes')
      && payoutOnlySuccess
    )
    && (
      pathname.startsWith('/payments/transactions')
      || pathname.startsWith('/payments/payouts')
      || pathname.startsWith('/payments/disputes')
      || !hideFinanceChrome
    )

  return (
    <div className={`mgmt-page payments-hub${hideFinanceChrome ? ' payments-hub--minimal' : ''}`}>
      {!hideFinanceChrome && (
        <div className="payments-hub__masthead">
          <div className="payments-hub__masthead-text">
            <p className="payments-hub__eyebrow">Finance</p>
            <h1 className="payments-hub__title">Payments</h1>
            <p className="payments-hub__tagline">
              Employer collections, worker payouts, cron health, and disputes — use the sidebar to switch areas.
            </p>
          </div>
          <div className="payments-hub__masthead-actions">
            <Button
              variant="secondary"
              onClick={handleRetryFailedPayoutsBatch}
              disabled={
                retryFailedLoading
                || triggerLoading
                || !((s?.retryHealth?.retriableFailedCount ?? 0) > 0)
              }
            >
              {retryFailedLoading
                ? 'Retrying failed…'
                : `↻ Retry failed payouts${(s?.retryHealth?.retriableFailedCount ?? 0) > 0 ? ` (${s.retryHealth.retriableFailedCount})` : ''}`}
            </Button>
            <Button
              variant="secondary"
              onClick={handleTriggerPayouts}
              disabled={triggerLoading || retryFailedLoading}
            >
              {triggerLoading ? 'Running payout job…' : '⚡ Run Payout Job'}
            </Button>
            <button
              type="button"
              className="payments-hub__refresh"
              onClick={fetchStats}
              disabled={statsLoading}
            >
              {statsLoading ? '↻ Loading…' : '↻ Refresh stats'}
            </button>
          </div>
        </div>
      )}

      {!hideFinanceChrome && hasRetryAlert && (
        <Alert variant="warning" className="mgmt-alert">
          {s.retryHealth.retriableFailedCount} online payout(s) failed and can be retried (up to {maxRetries} Razorpay attempts each).
          Use <strong>Retry failed payouts</strong> now, or wait for the 30-minute job.
          <strong> Run Payout Job</strong> only releases due <em>pending</em> payouts — it does not retry <em>failed</em> rows.
        </Alert>
      )}
      {error && <Alert variant="error" className="mgmt-alert">{error}</Alert>}
      {showSuccessBanner && (
        <Alert variant="info" className="mgmt-alert">{success}</Alert>
      )}
      {statsError && <Alert variant="error" className="mgmt-alert">{statsError}</Alert>}

      <Outlet />

      {disputeModal && disputeResolvePay && (
        <ConfirmModal
          title="Resolve dispute"
          message="Choose the final dispute status. All open dispute rows for the same job are updated together."
          confirmLabel="Apply resolution"
          onConfirm={confirmResolveDispute}
          onCancel={() => setDisputeModal(null)}
          loading={disputeLoading}
          variant={disputeModal.disputeStatus === 'resolved_employer' ? 'danger' : 'primary'}
        >
          <div style={{ padding: '0 1.25rem 0.75rem', fontSize: '0.8125rem', color: C.text, lineHeight: 1.5 }}>
            <div style={{ marginBottom: 10 }}>
              <strong>Job:</strong> {disputeResolveJob?.jobTitle || '—'}
              <br />
              <strong>Worker:</strong> {disputeResolveWorker?.fullName || disputeResolveWorker?.phoneNumber || '—'}
              <br />
              <strong>Raised:</strong> {disputeResolvePay.dispute?.raisedAt ? formatAdminDateTime(disputeResolvePay.dispute.raisedAt) : '—'}
              <br />
              <strong>Reason:</strong> {formatDisputeReason(disputeResolvePay.dispute?.reason)}
              {disputeResolveEvidence.length > 0 && (
                <>
                  <br />
                  <strong>Evidence:</strong> {disputeResolveEvidence.length} link(s) (see table)
                </>
              )}
            </div>
            <div style={{ color: C.muted, marginBottom: 12 }}>
              If this job has several open dispute lines (for example one employer dispute across multiple workers), they are all updated together.
            </div>
          </div>
          <div style={{ padding: '0 1.25rem 0.75rem' }}>
            <label htmlFor="dispute-outcome-select" style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem', fontWeight: 600, color: C.text }}>
              Dispute status (outcome)
            </label>
            <select
              id="dispute-outcome-select"
              value={disputeModal.disputeStatus}
              disabled={disputeLoading}
              onChange={(e) => setDisputeModal((m) => (m ? { ...m, disputeStatus: e.target.value } : m))}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.5rem 0.65rem',
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                marginBottom: 4,
              }}
            >
              {DISPUTE_RESOLVE_OUTCOME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div style={{ fontSize: '0.75rem', color: C.muted, lineHeight: 1.4 }}>
              {resolveOutcomeHint(disputeModal.disputeStatus)}
            </div>
          </div>
          <div style={{ padding: '0 1.25rem 1rem' }}>
            <label htmlFor="dispute-resolution-notes" style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem', fontWeight: 600, color: C.text }}>
              Internal notes (optional)
            </label>
            <textarea
              id="dispute-resolution-notes"
              value={disputeResolutionNotes}
              onChange={(e) => setDisputeResolutionNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              disabled={disputeLoading}
              placeholder="Stored on the payment record for audit"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.5rem 0.65rem',
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                fontFamily: 'inherit',
                fontSize: '0.875rem',
              }}
            />
          </div>
        </ConfirmModal>
      )}

      {disputeNotesModal && (
        <ConfirmModal
          title="Dispute notes"
          message="Internal notes on this payment’s dispute (audit). Does not change payout or dispute status."
          confirmLabel="Save notes"
          onConfirm={saveDisputeNotes}
          onCancel={() => setDisputeNotesModal(null)}
          loading={disputeNotesLoading}
          variant="primary"
        >
          <div style={{ padding: '0 1.25rem 1rem' }}>
            <label htmlFor="dispute-notes-only" style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem', fontWeight: 600, color: C.text }}>
              Resolution notes
            </label>
            <textarea
              id="dispute-notes-only"
              value={disputeNotesDraft}
              onChange={(e) => setDisputeNotesDraft(e.target.value)}
              rows={5}
              maxLength={2000}
              disabled={disputeNotesLoading}
              placeholder="Visible to admins on the dispute queue"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.5rem 0.65rem',
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                fontFamily: 'inherit',
                fontSize: '0.875rem',
              }}
            />
          </div>
        </ConfirmModal>
      )}
    </div>
  )
}

export default function PaymentsLayout() {
  return (
    <PaymentsAdminProvider>
      <PaymentsLayoutInner />
    </PaymentsAdminProvider>
  )
}
