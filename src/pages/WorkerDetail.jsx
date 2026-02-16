import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { workersApi } from '../services/api'
import { kycLabel, kycImageVerificationLabel, getKycImageVerificationBadgeClass, getErrorMessage } from '../utils/format'
import { PageHeader, Alert, Button } from '../components/ui'
import KycImageVerificationModal from '../components/KycImageVerificationModal'
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

export default function WorkerDetail() {
  const { workerId } = useParams()
  const navigate = useNavigate()
  const [worker, setWorker] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [kycImageModalOpen, setKycImageModalOpen] = useState(false)
  const [kycImageSubmitting, setKycImageSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    workersApi.get(workerId)
      .then((res) => {
        if (!cancelled) setWorker(res.data || res)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Failed to load worker'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [workerId])

  const handleApproveKyc = async () => {
    if (!worker) return
    setSubmitting(true)
    try {
      const res = await workersApi.update(worker._id, { kycStatus: 'APPROVED' })
      setWorker(res.data || res)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to approve KYC'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleKycImageApprove = async () => {
    if (!worker) return
    setKycImageSubmitting(true)
    try {
      const res = await workersApi.update(worker._id, { kycImageVerification: 'VERIFIED' })
      setWorker(res.data || res)
      setKycImageModalOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update image verification'))
    } finally {
      setKycImageSubmitting(false)
    }
  }

  const handleKycImageReject = async () => {
    if (!worker) return
    setKycImageSubmitting(true)
    try {
      const res = await workersApi.update(worker._id, { kycImageVerification: 'FAILED' })
      setWorker(res.data || res)
      setKycImageModalOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update image verification'))
    } finally {
      setKycImageSubmitting(false)
    }
  }

  if (loading) return <div className="mgmt-page"><div className="mgmt-loading">Loading worker…</div></div>
  if (error && !worker) {
    return (
      <div className="mgmt-page">
        <Alert variant="error">{error}</Alert>
        <Button onClick={() => navigate('/workers')}>Back to Workers</Button>
      </div>
    )
  }

  const u = worker?.userId || worker?.user
  const phone = u?.phone ?? worker?.phone ?? '—'
  const email = u?.email ?? worker?.email ?? '—'
  const kyc = worker?.kyc
  const addr = Array.isArray(worker?.address) && worker.address[0] ? worker.address[0] : null
  const wallet = worker?.wallet

  return (
    <div className="mgmt-page">
      <PageHeader
        title="Worker details"
        subtitle="Review worker profile and KYC"
        primaryAction={kyc?.status !== 'APPROVED' && (
          <Button variant="primary" onClick={handleApproveKyc} disabled={submitting}>
            Approve KYC
          </Button>
        )}
        secondaryAction={<Button onClick={() => navigate('/workers')}>← Back to Workers</Button>}
      />

      {error && worker && <Alert variant="error" className="mgmt-alert">{error}</Alert>}

      <div className="job-view-grid detail-view">
        {/* KYC first – full width */}
        <section className="job-view-card kyc-card-first detail-view-kyc-first">
          <h3 className="view-section-title">KYC</h3>
          {!kyc ? (
            <p className="view-detail-empty-kyc">No KYC submitted yet.</p>
          ) : (
            <>
              <div className="view-detail-kyc-header">
                <span className={`view-kyc-status-badge ${kyc?.status === 'APPROVED' ? 'verified' : kyc?.status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                  {kycLabel(kyc?.status)}
                </span>
                {kyc?.kycImageVerification ? (
                  <span className={getKycImageVerificationBadgeClass(kyc.kycImageVerification)}>
                    Image verification: {kycImageVerificationLabel(kyc.kycImageVerification)}
                  </span>
                ) : null}
              </div>
              {(kyc?.aadhaarFrontImage || kyc?.aadhaarBackImage || kyc?.selfieImage) && (
                <div className="view-row view-row-full" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem', marginBottom: '0.5rem' }}>
                  <span className="view-label">Verify images</span>
                  <span className="view-value">
                    <Button variant="secondary" onClick={() => setKycImageModalOpen(true)}>
                      Verify KYC images
                    </Button>
                  </span>
                </div>
              )}
              <div className="view-row">
                <span className="view-label">Status</span>
                <span className="view-value">{kycLabel(kyc?.status)}</span>
              </div>
              <div className="view-row">
                <span className="view-label">Image verification</span>
                <span className="view-value">
                  {kyc?.kycImageVerification ? (
                    <span className={getKycImageVerificationBadgeClass(kyc.kycImageVerification)}>
                      {kycImageVerificationLabel(kyc.kycImageVerification)}
                    </span>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              {kyc?.aadhaarReference && (
                <div className="view-row">
                  <span className="view-label">Aadhaar reference</span>
                  <span className="view-value">{kyc.aadhaarReference}</span>
                </div>
              )}
              {(kyc?.aadhaarFrontImage || kyc?.aadhaarBackImage || kyc?.selfieImage) && (
                <div className="view-row view-row-full">
                  <span className="view-label">Documents &amp; photos</span>
                  <span className="view-value view-value-full">
                    <div className="view-kyc-images-grid">
                      {kyc.aadhaarFrontImage && (
                        <div className="view-kyc-image-item">
                          <img src={kyc.aadhaarFrontImage} alt="Aadhaar front" />
                          <div className="view-kyc-image-caption">Aadhaar front</div>
                        </div>
                      )}
                      {kyc.aadhaarBackImage && (
                        <div className="view-kyc-image-item">
                          <img src={kyc.aadhaarBackImage} alt="Aadhaar back" />
                          <div className="view-kyc-image-caption">Aadhaar back</div>
                        </div>
                      )}
                      {kyc.selfieImage && (
                        <div className="view-kyc-image-item">
                          <img src={kyc.selfieImage} alt="Selfie" />
                          <div className="view-kyc-image-caption">Selfie</div>
                        </div>
                      )}
                    </div>
                  </span>
                </div>
              )}
              {kyc?.bankAccountNumber && (
                <div className="view-row">
                  <span className="view-label">Bank account</span>
                  <span className="view-value">{kyc.bankAccountNumber}</span>
                </div>
              )}
              {kyc?.ifscCode && (
                <div className="view-row">
                  <span className="view-label">IFSC</span>
                  <span className="view-value">{kyc.ifscCode}</span>
                </div>
              )}
              {kyc?.upiId && (
                <div className="view-row">
                  <span className="view-label">UPI ID</span>
                  <span className="view-value">{kyc.upiId}</span>
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
            </>
          )}
        </section>

        <section className="job-view-card">
          <h3 className="view-section-title">User &amp; profile</h3>
          <div className="view-row"><span className="view-label">Full name</span><span className="view-value">{worker?.fullName || '—'}</span></div>
          <div className="view-row"><span className="view-label">Phone</span><span className="view-value">{phone}</span></div>
          <div className="view-row"><span className="view-label">Phone number (worker)</span><span className="view-value">{worker?.phoneNumber || '—'}</span></div>
          <div className="view-row"><span className="view-label">WhatsApp</span><span className="view-value">{worker?.whatsappNumber || '—'}</span></div>
          <div className="view-row"><span className="view-label">Email</span><span className="view-value">{email}</span></div>
          <div className="view-row"><span className="view-label">Gender</span><span className="view-value">{worker?.gender || '—'}</span></div>
          <div className="view-row"><span className="view-label">Age</span><span className="view-value">{worker?.age ?? '—'}</span></div>
          <div className="view-row"><span className="view-label">Date of birth</span><span className="view-value">{formatDate(worker?.dob)}</span></div>
          <div className="view-row"><span className="view-label">Worker level</span><span className="view-value">{worker?.workerLevel || '—'}</span></div>
          <div className="view-row"><span className="view-label">Availability</span><span className="view-value">{worker?.availabilityStatus || '—'}</span></div>
          <div className="view-row"><span className="view-label">Profile score</span><span className="view-value">{worker?.profileScore ?? '—'}</span></div>
          <div className="view-row"><span className="view-label">Rating average</span><span className="view-value">{worker?.ratingAverage ?? '—'}</span></div>
          <div className="view-row"><span className="view-label">Unique worker ID</span><span className="view-value">{worker?.uniqueWorkerId || '—'}</span></div>
        </section>

        <section className="job-view-card">
          <h3 className="view-section-title">Skills &amp; work</h3>
          <div className="view-row">
            <span className="view-label">Skills</span>
            <span className="view-value">
              {Array.isArray(worker?.skills) && worker.skills.length ? worker.skills.join(', ') : '—'}
            </span>
          </div>
          <div className="view-row">
            <span className="view-label">Experience level</span>
            <span className="view-value">{worker?.experienceLevel || '—'}</span>
          </div>
          <div className="view-row">
            <span className="view-label">Daily earning expectation (₹)</span>
            <span className="view-value">{worker?.dailyEarningExpectation ?? '—'}</span>
          </div>
        </section>

        <section className="job-view-card">
          <h3 className="view-section-title">Address</h3>
          <div className="view-row">
            <span className="view-label">Address</span>
            <span className="view-value">{formatAddress(addr)}</span>
          </div>
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

      <KycImageVerificationModal
        open={kycImageModalOpen}
        onClose={() => setKycImageModalOpen(false)}
        aadhaarFrontImage={kyc?.aadhaarFrontImage}
        aadhaarBackImage={kyc?.aadhaarBackImage}
        selfieImage={kyc?.selfieImage}
        onApprove={handleKycImageApprove}
        onReject={handleKycImageReject}
        loading={kycImageSubmitting}
      />
    </div>
  )
}
