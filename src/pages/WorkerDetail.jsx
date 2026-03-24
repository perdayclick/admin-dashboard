import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { workersApi } from '../services/api'
import { jobStatusLabel, workerApplicationLabel } from '../utils/jobStatusLabels'
import {
  kycLabel,
  kycImageVerificationLabel,
  getKycImageVerificationBadgeClass,
  getErrorMessage,
  formatAdminDate,
} from '../utils/format'
import { getLatestKycImage, hasAnyKycImages, getAllKycImageItems } from '../utils/kycImages'
import { PageHeader, Alert, Button } from '../components/ui'
import KycImageVerificationModal from '../components/KycImageVerificationModal'
import '../styles/ManagementPage.css'

export default function WorkerDetail() {
  const { workerId } = useParams()
  const navigate = useNavigate()
  const [worker, setWorker] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [kycImageModalOpen, setKycImageModalOpen] = useState(false)
  const [kycImageSubmitting, setKycImageSubmitting] = useState(false)
  const [workHistory, setWorkHistory] = useState([])
  const [workHistoryLoading, setWorkHistoryLoading] = useState(false)

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

  useEffect(() => {
    if (!workerId) return
    let cancelled = false
    setWorkHistoryLoading(true)
    workersApi
      .jobApplications(workerId)
      .then((res) => {
        if (cancelled) return
        const d = res.data || res
        setWorkHistory(d.applications || [])
      })
      .catch(() => {
        if (!cancelled) setWorkHistory([])
      })
      .finally(() => {
        if (!cancelled) setWorkHistoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [workerId])

  /** Modal Approve: sets both kycImageVerification and kycStatus to approved. */
  const handleKycImageApprove = async () => {
    if (!worker) return
    setKycImageSubmitting(true)
    try {
      const res = await workersApi.update(worker._id, {
        kycImageVerification: 'VERIFIED',
        kycStatus: 'APPROVED',
      })
      setWorker(res.data || res)
      setKycImageModalOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to approve KYC'))
    } finally {
      setKycImageSubmitting(false)
    }
  }

  const handleKycImageReject = async (rejectedImages, kycRejectedReason) => {
    if (!worker) return
    setKycImageSubmitting(true)
    try {
      const res = await workersApi.update(worker._id, {
        kycStatus: 'REJECTED',
        kycImageVerification: 'FAILED',
        rejectedImages: Array.isArray(rejectedImages) ? rejectedImages : [],
        kycRejectedReason: (kycRejectedReason || '').trim(),
      })
      setWorker(res.data || res)
      setKycImageModalOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reject KYC'))
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
  const phone = u?.phone ?? worker?.phoneNumber ?? worker?.phone ?? '—'
  const email = u?.email ?? worker?.email ?? '—'
  const kyc = worker?.kyc
  const addr = Array.isArray(worker?.address) && worker.address[0] ? worker.address[0] : null
  const wallet = worker?.wallet
  const displayName = worker?.fullName || worker?.phoneNumber || (phone !== '—' ? phone : 'Worker')
  const isLocked = worker?.isLocked === true
  const displayUniqueWorkerId = worker?.uniqueWorkerId || (worker?._id ? 'W' + String(worker._id).slice(-8).toUpperCase() : '—')

  return (
    <div className="mgmt-page job-detail-page">
      <PageHeader
        title="Worker details"
        subtitle="Review worker profile and KYC"
        secondaryAction={<Button onClick={() => navigate('/workers')}>← Back to Workers</Button>}
      />

      {error && worker && <Alert variant="error" className="mgmt-alert">{error}</Alert>}

      <div className="job-view-hero">
        <div className="job-view-hero-main">
          <h2 className="job-view-title">{displayName}</h2>
          {worker?.workerLevel && <span className="mgmt-badge badge-info">{worker.workerLevel}</span>}
          {worker?.availabilityStatus && worker.availabilityStatus !== 'AVAILABLE' && (
            <span className="mgmt-badge badge-secondary">{worker.availabilityStatus}</span>
          )}
          {isLocked && <span className="mgmt-badge badge-warning">Locked (assigned to job)</span>}
        </div>
        {(phone !== '—' || displayUniqueWorkerId !== '—') && (
          <p className="job-view-posted">
            {phone !== '—' && <span>{phone}</span>}
            {displayUniqueWorkerId !== '—' && <span>{phone !== '—' ? ' · ' : ''}ID: {displayUniqueWorkerId}</span>}
          </p>
        )}
      </div>

      <div className="job-view-stats">
        <div className="job-view-stat">
          <span className="job-view-stat-value">{worker?.profileScore ?? '—'}</span>
          <span className="job-view-stat-label">Profile score</span>
        </div>
        <div className="job-view-stat">
          <span className="job-view-stat-value">{worker?.ratingAverage ?? '—'}</span>
          <span className="job-view-stat-label">Rating</span>
        </div>
        <div className="job-view-stat">
          <span className="job-view-stat-value">{kyc?.status === 'APPROVED' ? 'Verified' : kyc?.status || '—'}</span>
          <span className="job-view-stat-label">KYC status</span>
        </div>
        <div className="job-view-stat">
          <span className="job-view-stat-value">{workHistoryLoading ? '…' : workHistory.length}</span>
          <span className="job-view-stat-label">Job applications</span>
        </div>
      </div>

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
              {hasAnyKycImages(kyc) && (
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
              {hasAnyKycImages(kyc) && (
                <div className="view-row view-row-full">
                  <span className="view-label">Documents &amp; photos</span>
                  <span className="view-value view-value-full">
                    <div className="view-kyc-images-grid">
                      {getAllKycImageItems(kyc).map((item, index) => (
                        <div key={`${item.imageUrl}-${index}`} className="view-kyc-image-item">
                          <img src={item.imageUrl} alt={item.label} />
                          <div className="view-kyc-image-caption">{item.label}</div>
                        </div>
                      ))}
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
                  <span className="view-value">{formatAdminDate(kyc.verifiedAt)}</span>
                </div>
              )}
              {kyc?.remarks && (
                <div className="view-row">
                  <span className="view-label">Remarks</span>
                  <span className="view-value">{kyc.remarks}</span>
                </div>
              )}
              {kyc?.status === 'REJECTED' && (kyc?.rejectedImages?.length > 0 || kyc?.rejectedImageType || kyc?.kycRejectedReason) && (
                <>
                  {(kyc.rejectedImages?.length > 0 || kyc.rejectedImageType) && (
                    <div className="view-row">
                      <span className="view-label">Rejected image(s)</span>
                      <span className="view-value">
                        {kyc.rejectedImages?.length > 0
                          ? kyc.rejectedImages.map((e, i) => (
                              <span key={i}>
                                {e.imageType === 'FRONT' ? 'Aadhaar front' : e.imageType === 'BACK' ? 'Aadhaar back' : 'Profile image'}
                                {kyc.rejectedImages.length > 1 && i < kyc.rejectedImages.length - 1 ? ', ' : ''}
                              </span>
                            ))
                          : kyc.rejectedImageType === 'FRONT' ? 'Aadhaar front' : kyc.rejectedImageType === 'BACK' ? 'Aadhaar back' : kyc.rejectedImageType === 'SELFIE' ? 'Profile image' : kyc.rejectedImageType}
                      </span>
                    </div>
                  )}
                  {kyc.kycRejectedReason && (
                    <div className="view-row">
                      <span className="view-label">KYC rejected reason</span>
                      <span className="view-value">{kyc.kycRejectedReason}</span>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>

        <section className="job-view-card">
          <h3 className="view-section-title">User &amp; profile</h3>
          <p className="view-detail-section-subtitle">Contact</p>
          <div className="view-row"><span className="view-label">Full name</span><span className="view-value">{worker?.fullName || '—'}</span></div>
          <div className="view-row"><span className="view-label">Phone</span><span className="view-value">{phone}</span></div>
          <div className="view-row"><span className="view-label">Phone number (worker)</span><span className="view-value">{worker?.phoneNumber || '—'}</span></div>
          <div className="view-row"><span className="view-label">Email</span><span className="view-value">{email}</span></div>
          <div className="view-row"><span className="view-label">Gender</span><span className="view-value">{worker?.gender || '—'}</span></div>
          <div className="view-row"><span className="view-label">Age</span><span className="view-value">{worker?.age ?? '—'}</span></div>
          <p className="view-detail-section-subtitle">Profile</p>
          <div className="view-row"><span className="view-label">Worker level</span><span className="view-value">{worker?.workerLevel || '—'}</span></div>
          <div className="view-row"><span className="view-label">Availability</span><span className="view-value">{worker?.availabilityStatus || '—'}</span></div>
          <div className="view-row"><span className="view-label">Profile score</span><span className="view-value">{worker?.profileScore ?? '—'}</span></div>
          <div className="view-row"><span className="view-label">Rating average</span><span className="view-value">{worker?.ratingAverage ?? '—'}</span></div>
          <div className="view-row"><span className="view-label">Unique worker ID</span><span className="view-value">{displayUniqueWorkerId}</span></div>
        </section>

        <section className="job-view-card">
          <h3 className="view-section-title">Skills &amp; work</h3>
          <div className="view-row view-row-full">
            <span className="view-label">Skills</span>
            <span className="view-value">
              {Array.isArray(worker?.skills) && worker.skills.length > 0 ? (
                <div className="view-tags">
                  {worker.skills.map((skill, i) => (
                    <span key={i} className="view-tag">{skill}</span>
                  ))}
                </div>
              ) : (
                '—'
              )}
            </span>
          </div>
          <div className="view-row">
            <span className="view-label">Experience level</span>
            <span className="view-value">{worker?.experienceLevel || '—'}</span>
          </div>
        </section>

        <section className="job-view-card">
          <h3 className="view-section-title">Address</h3>
          {addr && (addr.addressText || addr.city || addr.state || addr.pincode || addr.country) ? (
            <>
              {addr.addressText && (
                <div className="view-row">
                  <span className="view-label">Address line</span>
                  <span className="view-value">{addr.addressText}</span>
                </div>
              )}
              <div className="view-row">
                <span className="view-label">City</span>
                <span className="view-value">{addr.city || '—'}</span>
              </div>
              <div className="view-row">
                <span className="view-label">State</span>
                <span className="view-value">{addr.state || '—'}</span>
              </div>
              <div className="view-row">
                <span className="view-label">Pincode</span>
                <span className="view-value">{addr.pincode || '—'}</span>
              </div>
              <div className="view-row">
                <span className="view-label">Country</span>
                <span className="view-value">{addr.country || '—'}</span>
              </div>
            </>
          ) : (
            <div className="view-row">
              <span className="view-label">Address</span>
              <span className="view-value">—</span>
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

        <section className="job-view-card detail-page-jobs-section worker-detail-jobs-bottom">
          <h3 className="view-section-title">Job activity ({workHistoryLoading ? '…' : workHistory.length})</h3>
          <p className="view-detail-section-subtitle" style={{ marginTop: 0 }}>
            Jobs this worker applied to. <strong>Worker status</strong> is the application outcome;{' '}
            <strong>Job status</strong> is the employer&apos;s job lifecycle. Use <strong>Open job</strong> for full job details.
          </p>
          {workHistoryLoading ? (
            <p className="view-detail-empty-kyc">Loading…</p>
          ) : workHistory.length === 0 ? (
            <p className="view-detail-empty-kyc">No applications yet.</p>
          ) : (
            <div className="detail-jobs-table-wrap">
              <table className="mgmt-table detail-jobs-table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Worker status</th>
                    <th>Job status</th>
                    <th aria-label="Open job" />
                  </tr>
                </thead>
                <tbody>
                  {workHistory.map((row) => (
                    <tr key={String(row.applicationId)}>
                      <td>{row.jobTitle || '—'}</td>
                      <td>
                        <span className="mgmt-badge mgmt-status-availability">
                          {workerApplicationLabel(row.applicationStatus, row.jobStatus)}
                        </span>
                      </td>
                      <td>
                        {row.jobDeleted
                          ? 'Removed'
                          : row.jobStatus
                            ? jobStatusLabel(row.jobStatus)
                            : '—'}
                      </td>
                      <td>
                        {row.jobId && !row.jobDeleted ? (
                          <button
                            type="button"
                            className="mgmt-link"
                            onClick={() => navigate(`/jobs/${row.jobId}`)}
                          >
                            Open job →
                          </button>
                        ) : (
                          <span className="view-muted">Job removed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <KycImageVerificationModal
        open={kycImageModalOpen}
        onClose={() => setKycImageModalOpen(false)}
        allImageItems={getAllKycImageItems(kyc)}
        aadhaarNumber={(kyc?.aadhaarNumber || kyc?.aadhaarReference || '').trim()}
        onApprove={handleKycImageApprove}
        onReject={handleKycImageReject}
        loading={kycImageSubmitting}
      />
    </div>
  )
}
