import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { jobsApi, skillsApi } from '../services/api'
import { jobStatusLabel, jobStatusBadgeClass, JOB_STATUS } from '../constants/jobEnums'
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

  useEffect(() => {
    let cancelled = false
    jobsApi.get(jobId).then((res) => {
      if (!cancelled) setJob((res.data || res))
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
      setJob(res.data || res)
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
      setJob(res.data || res)
    } catch (err) {
      setError(getErrorMessage(err, 'Status update failed'))
    } finally {
      setStatusLoading(false)
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
  const canEdit = job?.status === JOB_STATUS.PENDING || job?.status === JOB_STATUS.REJECTED

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
      </div>

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
    </div>
  )
}
