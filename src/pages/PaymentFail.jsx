import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui'
import '../styles/ManagementPage.css'

const REASON_MESSAGES = {
  cancelled: 'You closed the payment window or cancelled the payment.',
  payment_failed: 'The payment could not be completed. Please try again or use another method.',
  verify_failed: 'Payment was received but verification failed. Please contact support if amount was debited.',
}

export default function PaymentFail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const jobId = searchParams.get('jobId')
  const reason = searchParams.get('reason') || 'payment_failed'
  const message = REASON_MESSAGES[reason] || REASON_MESSAGES.payment_failed

  return (
    <div className="mgmt-page" style={{ maxWidth: 480, margin: '2rem auto', textAlign: 'center' }}>
      <div className="job-view-card" style={{ padding: '2rem' }}>
        <h2 style={{ color: 'var(--danger, #dc2626)', marginBottom: '0.5rem' }}>Payment failed</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {jobId && (
            <Button variant="primary" onClick={() => navigate(`/jobs/${jobId}`)}>
              Back to job (try again)
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate('/jobs')}>
            View all jobs
          </Button>
        </div>
      </div>
    </div>
  )
}
