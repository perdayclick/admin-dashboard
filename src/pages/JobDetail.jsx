import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { jobsApi, skillsApi, workersApi } from '../services/api'
import { jobStatusLabel, jobStatusBadgeClass, JOB_STATUS, CANCELLATION_REASON } from '../constants/jobEnums'
import { getErrorMessage } from '../utils/format'
import { PageHeader, Alert, Button } from '../components/ui'
import JobForm from '../components/JobForm'
import ConfirmModal from '../components/ConfirmModal'
import '../styles/ManagementPage.css'

function formatDate(v) {
  if (!v) return '—'
  if (typeof v === 'string') return v.slice(0, 10)
  if (v.toISOString) return v.toISOString().slice(0, 10)
  return '—'
}

function formatPosted(createdAt) {
  if (!createdAt) return '—'
  const d = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString()
}

export default function JobDetail() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [skills, setSkills] = useState([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [workers, setWorkers] = useState([])
  const [workersLoading, setWorkersLoading] = useState(false)
  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [unassigningId, setUnassigningId] = useState(null)
  const [applicants, setApplicants] = useState([])
  const [applicantsLoading, setApplicantsLoading] = useState(false)
  const [hireLoading, setHireLoading] = useState(false)
  const [completeLoading, setCompleteLoading] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState(CANCELLATION_REASON.OTHER)
  const [cancelNote, setCancelNote] = useState('')
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [payScLoading, setPayScLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    jobsApi.get(jobId).then((res) => {
      if (!cancelled) {
        const payload = res?.data ?? res
        setJob(payload)
      }
    }).catch((err) => {
      if (!cancelled) setError(getErrorMessage(err, 'Failed to load job'))
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [jobId])

  useEffect(() => {
    let cancelled = false
    skillsApi.list({ limit: 200 }).then((res) => {
      if (!cancelled) setSkills((res.data || res).skills || [])
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const handleUpdate = async (values) => {
    setFormError('')
    setSubmitting(true)
    try {
      const res = await jobsApi.update(jobId, values)
      setJob(res?.data ?? res)
      setEditOpen(false)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Update failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    setSubmitting(true)
    try {
      await jobsApi.delete(jobId)
      navigate('/jobs')
    } catch (err) {
      setError(getErrorMessage(err, 'Delete failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetStatus = async (status) => {
    setStatusLoading(true)
    try {
      const res = await jobsApi.setStatus(jobId, status)
      setJob((res?.data ?? res) || job)
    } catch (err) {
      setError(getErrorMessage(err, 'Status update failed'))
    } finally {
      setStatusLoading(false)
    }
  }

  const loadWorkers = () => {
    setWorkersLoading(true)
    workersApi.list({ limit: 200 }).then((res) => {
      const payload = res?.data ?? res
      setWorkers(Array.isArray(payload?.workers) ? payload.workers : [])
    }).catch(() => setWorkers([])).finally(() => setWorkersLoading(false))
  }

  const handleAssignOpen = () => {
    setAssignOpen(true)
    setSelectedWorkerId('')
    loadWorkers()
  }

  const handleAssignSubmit = async () => {
    if (!selectedWorkerId) return
    setAssigning(true)
    try {
      const res = await jobsApi.assignWorker(jobId, selectedWorkerId)
      setJob((res?.data ?? res) || job)
      setAssignOpen(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Assign failed'))
    } finally {
      setAssigning(false)
    }
  }

  const handleUnassign = async (workerId) => {
    setUnassigningId(workerId)
    try {
      const res = await jobsApi.unassignWorker(jobId, workerId)
      setJob((res?.data ?? res) || job)
    } catch (err) {
      setError(getErrorMessage(err, 'Unassign failed'))
    } finally {
      setUnassigningId(null)
    }
  }

  const assignedWorkers = Array.isArray(job?.assignedWorkers) ? job.assignedWorkers : []
  const assignedIds = assignedWorkers.map((w) => w._id || w)
  const workersToShow = workers.filter((w) => !assignedIds.includes(w._id))

  const employerId = job?.employerId?._id || job?.employerId

  const loadApplicants = () => {
    if (!employerId) return
    setApplicantsLoading(true)
    jobsApi.getApplicants(jobId, employerId).then((res) => {
      setApplicants(Array.isArray(res?.data?.applicants) ? res.data.applicants : [])
    }).catch(() => setApplicants([])).finally(() => setApplicantsLoading(false))
  }

  const handleHire = async (workerId) => {
    setHireLoading(true)
    try {
      const res = await jobsApi.hire(jobId, workerId, employerId)
      setJob((res?.data ?? res) || job)
      setApplicants((prev) => prev.filter((a) => (a.workerId?._id || a.workerId) !== workerId))
    } catch (err) {
      setError(getErrorMessage(err, 'Hire failed'))
    } finally {
      setHireLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!employerId) return
    setCompleteLoading(true)
    try {
      const res = await jobsApi.complete(jobId, employerId)
      setJob((res?.data ?? res) || job)
    } catch (err) {
      setError(getErrorMessage(err, 'Complete failed'))
    } finally {
      setCompleteLoading(false)
    }
  }

  const handleCancelSubmit = async () => {
    setCancelSubmitting(true)
    try {
      const res = await jobsApi.cancel(jobId, {
        employerId,
        cancellationReason: cancelReason,
        cancellationNote: cancelNote,
      })
      setJob((res?.data ?? res) || job)
      setCancelOpen(false)
      setCancelReason(CANCELLATION_REASON.OTHER)
      setCancelNote('')
    } catch (err) {
      setError(getErrorMessage(err, 'Cancel failed'))
    } finally {
      setCancelSubmitting(false)
    }
  }

  const handlePayServiceCharge = async () => {
    if (!employerId) return
    setPayScLoading(true)
    try {
      const res = await jobsApi.payServiceCharge(jobId, employerId)
      setJob((res?.data ?? res) || job)
    } catch (err) {
      setError(getErrorMessage(err, 'Pay service charge failed'))
    } finally {
      setPayScLoading(false)
    }
  }

  if (loading) return <div className="mgmt-page"><div className="mgmt-loading">Loading job…</div></div>
  if (error && !job) return <div className="mgmt-page"><Alert variant="error">{error}</Alert><Button onClick={() => navigate('/jobs')}>Back to Jobs</Button></div>

  const employer = job?.employerId || job?.employer
  const employerName = employer?.businessName || employer?.companyName || employer?.contactPersonName || '—'
  const skillsList = job?.skillsRequired || job?.skills || []
  const skillNames = Array.isArray(skillsList) ? skillsList.map((s) => s?.name || s?._id) : []

  const canApprove = job?.status === JOB_STATUS.PENDING || job?.status === JOB_STATUS.REJECTED
  const canReject = job?.status === JOB_STATUS.PENDING
  const canGoLive = job?.status === JOB_STATUS.APPROVED
  const canClose = job?.status === JOB_STATUS.APPROVED || job?.status === JOB_STATUS.LIVE
  const canEdit = true
  const isLive = job?.status === JOB_STATUS.LIVE
  const isHired = job?.status === JOB_STATUS.HIRED
  const isInactiveUnpaid = job?.status === JOB_STATUS.INACTIVE_PENDING_PAYMENT

  const salaryDisplay = job?.perDayPayout != null ? `₹${job.perDayPayout}/day` : job?.salaryOrPayout != null ? `₹${job.salaryOrPayout}` : '—'

  return (
    <div className="mgmt-page">
      <PageHeader
        title="Job details"
        subtitle="View and manage this job posting"
        primaryAction={canEdit && <Button variant="primary" onClick={() => setEditOpen(true)}>Edit Job</Button>}
        secondaryAction={<Button onClick={() => navigate('/jobs')}>← Back to Jobs</Button>}
      />

      {error && <Alert variant="error" className="mgmt-alert">{error}</Alert>}

      {/* Hero: title + status + posted */}
      <div className="job-view-hero">
        <div className="job-view-hero-main">
          <h2 className="job-view-title">{job?.jobTitle || '—'}</h2>
          <span className={`mgmt-badge ${jobStatusBadgeClass(job?.status)}`}>{jobStatusLabel(job?.status)}</span>
        </div>
        <p className="job-view-posted">Posted {formatPosted(job?.createdAt)} · by {employerName}</p>
      </div>

      {/* Key stats row */}
      <div className="job-view-stats">
        <div className="job-view-stat">
          <span className="job-view-stat-value">{salaryDisplay}</span>
          <span className="job-view-stat-label">Salary</span>
        </div>
        <div className="job-view-stat">
          <span className="job-view-stat-value">{job?.workersRequired ?? '—'} / {job?.workersAssigned ?? 0}</span>
          <span className="job-view-stat-label">Workers required / assigned</span>
        </div>
        <div className="job-view-stat">
          <span className="job-view-stat-value">{job?.workType || '—'}</span>
          <span className="job-view-stat-label">Work type</span>
        </div>
      </div>

      {/* Action bar: Approve, Reject, Go Live, Close, Delete */}
      <div className="job-view-actions">
        {canApprove && <Button variant="primary" onClick={() => handleSetStatus(JOB_STATUS.APPROVED)} disabled={statusLoading}>Approve</Button>}
        {canReject && <Button variant="secondary" onClick={() => handleSetStatus(JOB_STATUS.REJECTED)} disabled={statusLoading}>Reject</Button>}
        {canGoLive && <Button variant="primary" onClick={() => handleSetStatus(JOB_STATUS.LIVE)} disabled={statusLoading}>Go Live</Button>}
        {canClose && <Button variant="secondary" onClick={() => handleSetStatus(JOB_STATUS.CLOSED)} disabled={statusLoading}>Close</Button>}
        <Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete</Button>
      </div>

      {/* Content cards */}
      <div className="job-view-grid">
        <section className="job-view-card">
          <h3 className="view-section-title">Employer</h3>
          <div className="view-row"><span className="view-label">Business / Company</span><span className="view-value">{employerName}</span></div>
          {employer?.contactPersonName && <div className="view-row"><span className="view-label">Contact</span><span className="view-value">{employer.contactPersonName}</span></div>}
        </section>

        <section className="job-view-card">
          <h3 className="view-section-title">Job details</h3>
          <div className="view-row"><span className="view-label">Status</span><span className={`badge ${jobStatusBadgeClass(job?.status)}`}>{jobStatusLabel(job?.status)}</span></div>
          <div className="view-row"><span className="view-label">Work type</span><span className="view-value">{job?.workType || '—'}</span></div>
          <div className="view-row"><span className="view-label">Duration</span><span className="view-value">{job?.duration || '—'}</span></div>
          {job?.jobDescription && (
            <div className="view-row"><span className="view-label">Description</span><span className="view-value job-view-desc" style={{ whiteSpace: 'pre-wrap' }}>{job.jobDescription}</span></div>
          )}
        </section>

        <section className="job-view-card">
          <h3 className="view-section-title">Pay &amp; workers</h3>
          <div className="view-row"><span className="view-label">Salary / payout</span><span className="view-value">{job?.salaryOrPayout ?? '—'}</span></div>
          <div className="view-row"><span className="view-label">Per day payout (₹)</span><span className="view-value">{job?.perDayPayout ?? '—'}</span></div>
          <div className="view-row"><span className="view-label">Payout type</span><span className="view-value">{job?.payoutType || '—'}</span></div>
          <div className="view-row"><span className="view-label">Workers required</span><span className="view-value">{job?.workersRequired ?? '—'}</span></div>
          <div className="view-row"><span className="view-label">Workers assigned</span><span className="view-value">{job?.workersAssigned ?? '—'}</span></div>
        </section>

        <section className="job-view-card">
          <h3 className="view-section-title">Requirements &amp; schedule</h3>
          <div className="view-row"><span className="view-label">Skills</span><span className="view-value">{skillNames.length ? skillNames.join(', ') : '—'}</span></div>
          <div className="view-row"><span className="view-label">Start date</span><span className="view-value">{formatDate(job?.startDate)}</span></div>
          <div className="view-row"><span className="view-label">End date</span><span className="view-value">{formatDate(job?.endDate)}</span></div>
          <div className="view-row"><span className="view-label">Work timings</span><span className="view-value">{job?.workTimings || '—'}</span></div>
          <div className="view-row"><span className="view-label">Shift type</span><span className="view-value">{job?.shiftType || '—'}</span></div>
          <div className="view-row"><span className="view-label">Urgent</span><span className="view-value">{job?.isUrgent ? 'Yes' : 'No'}</span></div>
        </section>

        {/* Applicants (LIVE): workers who applied – admin can hire from here */}
        {isLive && employerId && (
          <section className="job-view-card">
            <h3 className="view-section-title">Applicants (job flow test)</h3>
            <p className="view-row" style={{ marginBottom: '0.5rem' }}>
              <span className="view-label">Workers who applied</span>
              <Button variant="secondary" onClick={loadApplicants} disabled={applicantsLoading} style={{ marginLeft: '0.5rem' }}>
                {applicantsLoading ? 'Loading…' : 'Load applicants'}
              </Button>
            </p>
            {applicants.length === 0 && !applicantsLoading ? (
              <p className="view-value" style={{ color: 'var(--text-muted)' }}>Click “Load applicants” or no one has applied yet.</p>
            ) : (
              <ul className="mgmt-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {applicants.map((a) => {
                  const w = a.worker || a.workerId
                  const wid = w?._id || a.workerId
                  const name = w?.fullName || w?.phoneNumber || wid
                  return (
                    <li key={a._id || wid} className="view-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <button type="button" className="mgmt-link" onClick={() => navigate(`/workers/${wid}`)}>
                        {name}
                      </button>
                      <span className="view-value" style={{ fontSize: '0.875rem' }}>{w?.displayPhone || '—'}</span>
                      <Button variant="primary" onClick={() => handleHire(wid)} disabled={hireLoading}>
                        {hireLoading ? '…' : 'Hire'}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}

        {/* Hired: Complete / Cancel / Pay service charge */}
        {isHired && employerId && (
          <section className="job-view-card">
            <h3 className="view-section-title">Hired – next steps</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button variant="primary" onClick={handleComplete} disabled={completeLoading}>
                {completeLoading ? '…' : 'Mark complete'}
              </Button>
              <Button variant="danger" onClick={() => setCancelOpen(true)} disabled={cancelSubmitting}>
                Cancel worker
              </Button>
            </div>
          </section>
        )}
        {isInactiveUnpaid && employerId && (
          <section className="job-view-card">
            <h3 className="view-section-title">Unpaid service charge</h3>
            <p className="view-value" style={{ marginBottom: '0.5rem' }}>Pay service charge to unlock worker. Amount: ₹{job?.serviceChargeAmount ?? '—'}</p>
            <Button variant="primary" onClick={handlePayServiceCharge} disabled={payScLoading}>
              {payScLoading ? '…' : 'Pay service charge'}
            </Button>
          </section>
        )}

        <section className="job-view-card">
          <h3 className="view-section-title">Assigned workers</h3>
          <p className="view-row" style={{ marginBottom: '0.5rem' }}>
            <span className="view-label">Workers who got this job</span>
            <Button variant="primary" onClick={handleAssignOpen} style={{ marginLeft: '0.5rem' }}>Assign worker</Button>
          </p>
          {assignedWorkers.length === 0 ? (
            <p className="view-value" style={{ color: 'var(--text-muted)' }}>No workers assigned yet.</p>
          ) : (
            <ul className="mgmt-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {assignedWorkers.map((w) => {
                const wid = w._id || w
                const name = w.fullName || w.phoneNumber || wid
                return (
                  <li key={wid} className="view-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <button type="button" className="mgmt-link" onClick={() => navigate(`/workers/${wid}`)}>
                      {name}
                    </button>
                    <span className="view-value" style={{ fontSize: '0.875rem' }}>{w.phoneNumber || '—'}</span>
                    <Button variant="danger" onClick={() => handleUnassign(wid)} disabled={unassigningId === wid}>
                      {unassigningId === wid ? '…' : 'Unassign'}
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {job?.location?.coordinates && (
          <section className="job-view-card">
            <h3 className="view-section-title">Location</h3>
            <div className="view-row"><span className="view-label">Coordinates</span><span className="view-value">[{job.location.coordinates[0]}, {job.location.coordinates[1]}] (lng, lat)</span></div>
          </section>
        )}
      </div>

      {assignOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: 420 }}>
            <h3 className="view-section-title">Assign worker to this job</h3>
            {workersLoading ? (
              <p>Loading workers…</p>
            ) : (
              <>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="mgmt-select"
                  style={{ width: '100%', marginBottom: '0.75rem' }}
                >
                  <option value="">Select a worker</option>
                  {workersToShow.map((w) => (
                    <option key={w._id} value={w._id}>{w.fullName || w.phoneNumber || w._id}</option>
                  ))}
                </select>
                {workersToShow.length === 0 && <p className="view-value" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>All listed workers are already assigned or no workers found.</p>}
              </>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleAssignSubmit} disabled={!selectedWorkerId || assigning}>
                {assigning ? 'Assigning…' : 'Assign'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <JobForm
          title="Edit Job"
          job={job}
          employers={[]}
          skills={skills}
          onSubmit={handleUpdate}
          onClose={() => { setEditOpen(false); setFormError(''); }}
          error={formError}
          submitting={submitting}
          mode="edit"
        />
      )}

      {deleteOpen && (
        <ConfirmModal
          title="Delete Job"
          message={`Are you sure you want to delete "${job?.jobTitle || jobId}"?`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteOpen(false)}
          loading={submitting}
          variant="danger"
        />
      )}

      {cancelOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: 420 }}>
            <h3 className="view-section-title">Cancel hired worker</h3>
            <p className="view-value" style={{ marginBottom: '0.75rem' }}>Service charge may apply. If ≥ ₹100, worker stays locked until you pay.</p>
            <label className="view-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Reason</label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mgmt-select"
              style={{ width: '100%', marginBottom: '0.75rem' }}
            >
              {Object.entries(CANCELLATION_REASON).map(([k, v]) => (
                <option key={k} value={v}>{v.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <label className="view-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Note (optional)</label>
            <input
              type="text"
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              className="mgmt-input"
              style={{ width: '100%', marginBottom: '1rem' }}
              placeholder="Optional note"
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => { setCancelOpen(false); setCancelNote(''); }}>Back</Button>
              <Button variant="danger" onClick={handleCancelSubmit} disabled={cancelSubmitting}>
                {cancelSubmitting ? '…' : 'Cancel worker'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
