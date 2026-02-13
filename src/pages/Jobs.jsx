import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { jobsApi, employersApi, skillsApi } from '../services/api'
import { JOB_STATUS, JOB_STATUS_OPTIONS, jobStatusLabel, jobStatusBadgeClass } from '../constants/jobEnums'
import { WORK_TYPE_OPTIONS } from '../constants/jobEnums'
import { getErrorMessage } from '../utils/format'
import {
  PageHeader,
  SummaryCard,
  DataTable,
  TableEmptyRow,
  Pagination,
  Alert,
  Button,
} from '../components/ui'
import JobForm from '../components/JobForm'
import ConfirmModal from '../components/ConfirmModal'
import '../styles/ManagementPage.css'

export default function Jobs() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [workTypeFilter, setWorkTypeFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editJob, setEditJob] = useState(null)
  const [deleteJob, setDeleteJob] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [employers, setEmployers] = useState([])
  const [skills, setSkills] = useState([])
  const [statusLoadingId, setStatusLoadingId] = useState(null)

  const fetchJobs = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await jobsApi.list({
        page,
        limit: 10,
        status: statusFilter || undefined,
        workType: workTypeFilter || undefined,
        search: search.trim() || undefined,
      })
      const data = res.data || res
      setJobs(data.jobs || [])
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 0 })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load jobs'))
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, workTypeFilter, search])

  useEffect(() => {
    fetchJobs(pagination.page)
  }, [fetchJobs, pagination.page])

  useEffect(() => {
    let cancelled = false
    employersApi.list({ limit: 500 }).then((res) => {
      if (!cancelled) setEmployers((res.data || res).employers || [])
    }).catch(() => { if (!cancelled) setEmployers([]) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    skillsApi.list({ limit: 200 }).then((res) => {
      if (!cancelled) setSkills((res.data || res).skills || [])
    }).catch(() => { if (!cancelled) setSkills([]) })
    return () => { cancelled = true }
  }, [])

  const handleCreate = async (values) => {
    setFormError('')
    setSubmitting(true)
    try {
      await jobsApi.create(values)
      setCreateOpen(false)
      fetchJobs(1)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Create failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (jobId, values) => {
    setFormError('')
    setSubmitting(true)
    try {
      await jobsApi.update(jobId, values)
      setEditJob(null)
      fetchJobs(pagination.page)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Update failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteJob) return
    setSubmitting(true)
    try {
      await jobsApi.delete(deleteJob._id)
      setDeleteJob(null)
      fetchJobs(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Delete failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetStatus = async (jobId, status) => {
    setStatusLoadingId(jobId)
    try {
      await jobsApi.setStatus(jobId, status)
      fetchJobs(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Status update failed'))
    } finally {
      setStatusLoadingId(null)
    }
  }

  const getEmployerName = (job) => {
    const emp = job.employerId || job.employer
    if (!emp) return '—'
    return emp.businessName || emp.companyName || emp.contactPersonName || 'Employer'
  }

  const formatSalary = (j) => {
    if (j.perDayPayout != null) return `₹${j.perDayPayout}/day`
    if (j.salaryOrPayout != null) return `₹${j.salaryOrPayout}`
    return '—'
  }

  const formatPosted = (j) => {
    if (!j.createdAt) return '—'
    const d = typeof j.createdAt === 'string' ? new Date(j.createdAt) : j.createdAt
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

  const totalJobs = pagination.total ?? jobs.length
  const totalPending = jobs.filter((j) => j.status === JOB_STATUS.PENDING).length
  const totalLive = jobs.filter((j) => j.status === JOB_STATUS.LIVE).length
  const totalClosed = jobs.filter((j) => j.status === JOB_STATUS.CLOSED).length

  return (
    <div className="mgmt-page">
      <PageHeader
        title="Jobs & Tasks Control"
        subtitle="Review, approve, and monitor all job postings."
        primaryAction={<Button variant="primary" onClick={() => setCreateOpen(true)}>Create Job</Button>}
      />

      <div className="mgmt-cards">
        <SummaryCard value={totalJobs} label="Total Jobs" />
        <SummaryCard value={totalPending} label="Pending Approval" meta="Needs review" metaVariant="warning" />
        <SummaryCard value={totalLive} label="Active Jobs" meta="Currently running" metaVariant="positive" />
        <SummaryCard value={totalClosed} label="Closed" />
      </div>

      <div className="mgmt-toolbar">
        <form
          onSubmit={(e) => { e.preventDefault(); setPagination((p) => ({ ...p, page: 1 })); fetchJobs(1); }}
          className="mgmt-filters"
          style={{ flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}
        >
          <input
            type="search"
            placeholder="Search by job title, employer, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mgmt-search-input"
            style={{ minWidth: 220 }}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="mgmt-select">
            {JOB_STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select value={workTypeFilter} onChange={(e) => setWorkTypeFilter(e.target.value)} className="mgmt-select">
            <option value="">All work types</option>
            {WORK_TYPE_OPTIONS.filter((o) => o.value).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button type="submit" className="mgmt-btn mgmt-btn-primary">Apply</button>
        </form>
      </div>

      {error && <Alert variant="error" className="mgmt-alert">{error}</Alert>}

      <DataTable loading={loading} emptyMessage="No jobs found" emptyColSpan={7}>
        <table className="mgmt-table">
          <thead>
            <tr>
              <th>Job / Employer</th>
              <th>Salary</th>
              <th>Status</th>
              <th>Workers</th>
              <th>Assigned</th>
              <th>Posted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && jobs.length === 0 && <TableEmptyRow colSpan={7} message="No jobs found" />}
            {jobs.map((j) => {
              const isPending = j.status === JOB_STATUS.PENDING
              const loadingThis = statusLoadingId === j._id
              return (
                <tr key={j._id}>
                  <td>
                    <button type="button" className="mgmt-link" onClick={() => navigate(`/jobs/${j._id}`)}>
                      {j.jobTitle || '—'}
                    </button>
                    <div className="mgmt-table-meta">{getEmployerName(j)}</div>
                  </td>
                  <td>{formatSalary(j)}</td>
                  <td><span className={`mgmt-badge ${jobStatusBadgeClass(j.status)}`}>{jobStatusLabel(j.status)}</span></td>
                  <td>{j.workersRequired ?? '—'}</td>
                  <td>{j.workersAssigned ?? 0}</td>
                  <td>{formatPosted(j)}</td>
                  <td>
                    <div className="mgmt-actions-cell">
                      <button type="button" className="mgmt-action-btn" onClick={() => navigate(`/jobs/${j._id}`)} title="View details" aria-label="View">
                        <span aria-hidden>👁</span>
                      </button>
                      {(j.status === JOB_STATUS.PENDING || j.status === JOB_STATUS.REJECTED) && (
                        <button type="button" className="mgmt-action-btn" onClick={() => setEditJob(j)} title="Edit" aria-label="Edit">✎</button>
                      )}
                      {isPending && (
                        <>
                          <Button variant="primary" onClick={() => handleSetStatus(j._id, JOB_STATUS.APPROVED)} disabled={loadingThis} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}>Approve</Button>
                          <Button variant="danger" onClick={() => handleSetStatus(j._id, JOB_STATUS.REJECTED)} disabled={loadingThis} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}>Reject</Button>
                        </>
                      )}
                      <button type="button" className="mgmt-action-btn mgmt-action-btn-danger" onClick={() => setDeleteJob(j)} title="Delete" aria-label="Delete">✕</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </DataTable>

      {pagination.pages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        />
      )}

      {createOpen && (
        <JobForm
          title="Create Job"
          employers={employers}
          skills={skills}
          onSubmit={handleCreate}
          onClose={() => { setCreateOpen(false); setFormError(''); }}
          error={formError}
          submitting={submitting}
          mode="create"
        />
      )}

      {editJob && (
        <JobForm
          title="Edit Job"
          job={editJob}
          employers={employers}
          skills={skills}
          onSubmit={(payload) => handleUpdate(editJob._id, payload)}
          onClose={() => { setEditJob(null); setFormError(''); }}
          error={formError}
          submitting={submitting}
          mode="edit"
        />
      )}

      {deleteJob && (
        <ConfirmModal
          title="Delete Job"
          message={`Are you sure you want to delete "${deleteJob.jobTitle || deleteJob._id}"?`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteJob(null)}
          loading={submitting}
          variant="danger"
        />
      )}
    </div>
  )
}
