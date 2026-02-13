import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { employersApi } from '../services/api'
import { kycLabel, getErrorMessage } from '../utils/format'
import { PageHeader, Alert, Button } from '../components/ui'
import '../styles/ManagementPage.css'

function formatDate(v) {
  if (!v) return '—'
  if (typeof v === 'string') return v.slice(0, 10)
  if (v.toISOString) return v.toISOString().slice(0, 10)
  return '—'
}

function formatAddress(addr) {
  if (!addr || typeof addr !== 'object') return '—'
  const parts = [addr.addressText, addr.city, addr.state, addr.pincode, addr.country].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}

export default function EmployerDetail() {
  const { employerId } = useParams()
  const navigate = useNavigate()
  const [employer, setEmployer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    employersApi.get(employerId)
      .then((res) => {
        if (!cancelled) setEmployer(res.data || res)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Failed to load employer'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [employerId])

  const handleApproveKyc = async () => {
    if (!employer) return
    setSubmitting(true)
    try {
      const res = await employersApi.update(employer._id, { kycStatus: 'APPROVED' })
      setEmployer(res.data || res)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to approve KYC'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="mgmt-page"><div className="mgmt-loading">Loading employer…</div></div>
  if (error && !employer) {
    return (
      <div className="mgmt-page">
        <Alert variant="error">{error}</Alert>
        <Button onClick={() => navigate('/employers')}>Back to Employers</Button>
      </div>
    )
  }

  const u = employer?.userId || employer?.user
  const phone = u?.phone ?? employer?.phone ?? '—'
  const email = u?.email ?? employer?.email ?? '—'
  const kyc = employer?.kyc
  const addr = Array.isArray(employer?.address) && employer.address[0] ? employer.address[0] : null
  const wallet = employer?.wallet

  return (
    <div className="mgmt-page">
      <PageHeader
        title="Employer details"
        subtitle="Review employer profile and KYC"
        primaryAction={kyc?.status !== 'APPROVED' && (
          <Button variant="primary" onClick={handleApproveKyc} disabled={submitting}>
            Approve KYC
          </Button>
        )}
        secondaryAction={<Button onClick={() => navigate('/employers')}>← Back to Employers</Button>}
      />

      {error && employer && <Alert variant="error" className="mgmt-alert">{error}</Alert>}

      <div className="job-view-grid">
        <section className="job-view-card">
          <h3 className="view-section-title">User &amp; business</h3>
          <div className="view-row"><span className="view-label">Full name</span><span className="view-value">{employer?.fullName || '—'}</span></div>
          <div className="view-row"><span className="view-label">Gender</span><span className="view-value">{employer?.gender || '—'}</span></div>
          <div className="view-row"><span className="view-label">Business name</span><span className="view-value">{employer?.businessName || '—'}</span></div>
          <div className="view-row"><span className="view-label">Company name</span><span className="view-value">{employer?.companyName || '—'}</span></div>
          <div className="view-row"><span className="view-label">GST number</span><span className="view-value">{employer?.gstNumber || '—'}</span></div>
          <div className="view-row"><span className="view-label">Phone</span><span className="view-value">{phone}</span></div>
          <div className="view-row"><span className="view-label">Email</span><span className="view-value">{email}</span></div>
          <div className="view-row"><span className="view-label">Contact person</span><span className="view-value">{employer?.contactPersonName || '—'}</span></div>
          <div className="view-row"><span className="view-label">Contact phone</span><span className="view-value">{employer?.contactPersonPhone || '—'}</span></div>
          <div className="view-row"><span className="view-label">Date of birth</span><span className="view-value">{formatDate(employer?.dob)}</span></div>
          <div className="view-row"><span className="view-label">Verification type</span><span className="view-value">{employer?.verificationType || '—'}</span></div>
          <div className="view-row"><span className="view-label">Availability</span><span className="view-value">{employer?.availabilityStatus || '—'}</span></div>
          <div className="view-row"><span className="view-label">Profile completion %</span><span className="view-value">{employer?.profileCompletionPercent ?? '—'}</span></div>
          <div className="view-row"><span className="view-label">Rating average</span><span className="view-value">{employer?.ratingAverage ?? '—'}</span></div>
          <div className="view-row"><span className="view-label">Total jobs posted</span><span className="view-value">{employer?.totalJobsPosted ?? '—'}</span></div>
          <div className="view-row"><span className="view-label">Verified</span><span className="view-value">{employer?.isVerified ? 'Yes' : 'No'}</span></div>
        </section>

        <section className="job-view-card">
          <h3 className="view-section-title">Job categories</h3>
          <div className="view-row">
            <span className="view-label">Categories</span>
            <span className="view-value">
              {Array.isArray(employer?.jobCategories) && employer.jobCategories.length
                ? employer.jobCategories.join(', ')
                : '—'}
            </span>
          </div>
        </section>

        <section className="job-view-card">
          <h3 className="view-section-title">Address</h3>
          <div className="view-row">
            <span className="view-label">Address</span>
            <span className="view-value">{formatAddress(addr)}</span>
          </div>
        </section>

        <section className="job-view-card">
          <h3 className="view-section-title">KYC</h3>
          <div className="view-row">
            <span className="view-label">Status</span>
            <span className="view-value">{kycLabel(kyc?.status)}</span>
          </div>
          {kyc?.gstCertificate && (
            <div className="view-row">
              <span className="view-label">GST certificate</span>
              <span className="view-value">{kyc.gstCertificate}</span>
            </div>
          )}
          {kyc?.companyPan && (
            <div className="view-row">
              <span className="view-label">Company PAN</span>
              <span className="view-value">{kyc.companyPan}</span>
            </div>
          )}
          {(kyc?.aadhaarFrontImage || kyc?.aadhaarBackImage) && (
            <div className="view-row">
              <span className="view-label">Aadhaar images</span>
              <span className="view-value">
                {kyc.aadhaarFrontImage && (
                  <img
                    src={kyc.aadhaarFrontImage}
                    alt="Aadhaar front"
                    style={{ maxWidth: '100%', maxHeight: '160px', display: 'block', marginBottom: '0.5rem', borderRadius: '4px' }}
                  />
                )}
                {kyc.aadhaarBackImage && (
                  <img
                    src={kyc.aadhaarBackImage}
                    alt="Aadhaar back"
                    style={{ maxWidth: '100%', maxHeight: '160px', display: 'block', borderRadius: '4px' }}
                  />
                )}
              </span>
            </div>
          )}
          {kyc?.verifiedAt && (
            <div className="view-row">
              <span className="view-label">Verified at</span>
              <span className="view-value">{formatDate(kyc.verifiedAt)}</span>
            </div>
          )}
          {kyc?.remarks && (
            <div className="view-row">
              <span className="view-label">Remarks</span>
              <span className="view-value">{kyc.remarks}</span>
            </div>
          )}
        </section>

        {wallet && (wallet.balance != null || wallet.amountCredit != null || wallet.amountDebit != null) && (
          <section className="job-view-card">
            <h3 className="view-section-title">Wallet</h3>
            <div className="view-row">
              <span className="view-label">Balance (₹)</span>
              <span className="view-value">{wallet.balance ?? '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Credit</span>
              <span className="view-value">{wallet.amountCredit ?? '—'}</span>
            </div>
            <div className="view-row">
              <span className="view-label">Debit</span>
              <span className="view-value">{wallet.amountDebit ?? '—'}</span>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

