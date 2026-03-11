import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui'
import '../styles/ManagementPage.css'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const jobId = searchParams.get('jobId')

  return (
    <div className="mgmt-page" style={{ maxWidth: 480, margin: '2rem auto', textAlign: 'center' }}>
      <div className="job-view-card" style={{ padding: '2rem' }}>
        <h2 style={{ color: 'var(--success, #059669)', marginBottom: '0.5rem' }}>Payment successful</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Your payment for the job has been completed and verified successfully.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {jobId && (
            <Button variant="primary" onClick={() => navigate(`/jobs/${jobId}`)}>
              Back to job
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
