import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { jobsApi, employersApi, skillsApi } from '../services/api'
import { JOB_STATUS, JOB_STATUS_OPTIONS, jobStatusLabel, jobStatusBadgeClass } from '../constants/jobEnums'
import { effectiveWorkerTarget } from '../utils/jobListingForm'
import { WORK_TYPE_OPTIONS } from '../constants/jobEnums'
import { getErrorMessage } from '../utils/format'
import {
  PageHeader,
  SummaryCard,
  SearchToolbar,
  DataTable,
  TableEmptyRow,
  Pagination,
  Alert,
  Button,
} from '../components/ui'
import JobForm from '../components/JobForm'
import ConfirmModal from '../components/ConfirmModal'
import '../styles/ManagementPage.css'

const ADMIN_JOB_LANG_KEY = 'admin_job_preview_lang'

export default function Jobs() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const employerIdFromUrl = searchParams.get('employerId') || ''
  const [jobs, setJobs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [workTypeFilter, setWorkTypeFilter] = useState('')
  const [employerFilter, setEmployerFilter] = useState(employerIdFromUrl)
  const [createOpen, setCreateOpen] = useState(false)
  const [editJob, setEditJob] = useState(null)
  const [deleteJob, setDeleteJob] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [employers, setEmployers] = useState([])
  const [skills, setSkills] = useState([])
  const [statusLoadingId, setStatusLoadingId] = useState(null)
  const [viewLang, setViewLang] = useState(() => localStorage.getItem(ADMIN_JOB_LANG_KEY) || 'en')
  const [locales, setLocales] = useState([])

  const fetchJobs = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await jobsApi.list({
        page,
        limit: 10,
        status: statusFilter || undefined,
        workType: workTypeFilter || undefined,
        employerId: employerFilter || undefined,
        search: search.trim() || undefined,
        lang: viewLang || undefined,
      })
      const payload = res?.data ?? res
      const jobList = payload?.jobs ?? payload ?? []
      const pag = payload?.pagination ?? { page: 1, limit: 10, total: 0, pages: 0 }
      setJobs(Array.isArray(jobList) ? jobList : [])
      setPagination({ ...pag, page: pag.page ?? 1, limit: pag.limit ?? 10, total: pag.total ?? 0, pages: pag.pages ?? 0 })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load jobs'))
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, workTypeFilter, employerFilter, search, viewLang])

  useEffect(() => {
    if (employerIdFromUrl) setEmployerFilter(employerIdFromUrl)
  }, [employerIdFromUrl])

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

  useEffect(() => {
    localStorage.setItem(ADMIN_JOB_LANG_KEY, viewLang)
  }, [viewLang])

  useEffect(() => {
    let cancelled = false
    jobsApi.translationLocales().then((res) => {
      const raw = res?.data?.locales ?? res?.locales
      if (!cancelled && Array.isArray(raw)) setLocales(raw)
    }).catch(() => { if (!cancelled) setLocales([]) })
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
      await jobsApi.update(jobId, values, { lang: viewLang })
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
    return emp.businessName || emp.companyName || emp.fullName || 'Employer'
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

  const totalJobs = pagination.total ?? 0
  const totalPending = jobs.filter((j) => j.status === JOB_STATUS.PENDING).length
  const totalLive = jobs.filter((j) => j.status === JOB_STATUS.LIVE).length
  const totalClosed = jobs.filter((j) => j.status === JOB_STATUS.CLOSED).length
  const totalListingExpired = jobs.filter((j) => j.status === JOB_STATUS.LISTING_EXPIRED).length

  const statusOptions = JOB_STATUS_OPTIONS
  const workTypeOptions = [{ value: '', label: 'All work types' }, ...WORK_TYPE_OPTIONS.filter((o) => o.value)]
  const employerOptions = [{ value: '', label: 'All employers' }, ...employers.map((e) => ({ value: e._id, label: e.businessName || e.companyName || e.fullName || e._id }))]

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
        <SummaryCard value={totalListingExpired} label="Listing expired" meta="On this page" />
      </div>

      <SearchToolbar
        searchValue={search}
        onSearchChange={setSearch}
        onSearchSubmit={(e) => { e.preventDefault(); setPagination((p) => ({ ...p, page: 1 })); fetchJobs(1); }}
        searchPlaceholder="Search by job title, employer, or ID..."
        filterOptions={statusOptions}
        filterValue={statusFilter}
        onFilterChange={(v) => { setStatusFilter(v); setPagination((p) => ({ ...p, page: 1 })); }}
        filterLabel="Status"
        onRefresh={() => fetchJobs(pagination.page)}
        refreshing={loading}
        extraButton={
          <>
            <select
              value={workTypeFilter}
              onChange={(e) => { setWorkTypeFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
              className="mgmt-select"
              aria-label="Work type"
            >
              {workTypeOptions.map((o) => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={employerFilter}
              onChange={(e) => { setEmployerFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
              className="mgmt-select"
              aria-label="Employer"
              style={{ minWidth: 160 }}
            >
              {employerOptions.map((o) => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </select>
            <label className="mgmt-select-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#374151' }}>
              Language
              <select
                value={viewLang}
                onChange={(e) => { setViewLang(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                className="mgmt-select"
                aria-label="Preview language for job title"
                style={{ minWidth: 140 }}
              >
                {(locales.length ? locales : [{ code: 'en', label: 'English' }]).map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </label>
            <Button variant="primary" onClick={() => fetchJobs(1)} disabled={loading}>
              {loading ? 'Refreshing…' : 'Apply'}
            </Button>
          </>
        }
      />

      {error && <Alert variant="error" className="mgmt-alert">{error}</Alert>}

      <DataTable loading={loading} loadingMessage="Loading jobs…" emptyColSpan={8}>
        <table className="mgmt-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Employer</th>
              <th>Salary</th>
              <th>Work type</th>
              <th>Status</th>
              <th>Workers</th>
              <th>Posted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && jobs.length === 0 && <TableEmptyRow colSpan={8} message="No jobs found" />}
            {jobs.map((j) => {
              const isPending = j.status === JOB_STATUS.PENDING
              const loadingThis = statusLoadingId === j._id
              const empId = j.employerId?._id || j.employerId
              return (
                <tr key={j._id}>
                  <td>
                    <button type="button" className="mgmt-link" onClick={() => navigate(`/jobs/${j._id}`)}>
                      {j.jobTitle || '—'}
                    </button>
                  </td>
                  <td>
                    {empId ? (
                      <button type="button" className="mgmt-link" onClick={() => navigate(`/employers/${empId}`)}>
                        {getEmployerName(j)}
                      </button>
                    ) : (
                      getEmployerName(j)
                    )}
                  </td>
                  <td>{formatSalary(j)}</td>
                  <td>{j.workType || '—'}</td>
                  <td><span className={`mgmt-badge ${jobStatusBadgeClass(j.status)}`}>{jobStatusLabel(j.status)}</span></td>
                  <td>
                    <span>{j.workersAssigned ?? 0} / {effectiveWorkerTarget(j)}</span>
                    {j.hiringClosed && (
                      <span className="mgmt-badge badge-secondary" style={{ marginLeft: '0.35rem', fontSize: '0.65rem' }} title="Employer stopped further hiring">
                        Hiring closed
                      </span>
                    )}
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>posted {j.workersRequired ?? '—'}</div>
                  </td>
                  <td>{formatPosted(j)}</td>
                  <td>
                    <div className="mgmt-actions-cell">
                      <button type="button" className="mgmt-action-btn" onClick={() => navigate(`/jobs/${j._id}`)} title="View details">View</button>
                      <button type="button" className="mgmt-action-btn" onClick={() => setEditJob(j)} title="Edit">Edit</button>
                      {isPending && (
                        <>
                          <button type="button" className="mgmt-action-btn mgmt-action-btn-success" onClick={() => handleSetStatus(j._id, JOB_STATUS.APPROVED)} disabled={loadingThis}>Approve</button>
                          <button type="button" className="mgmt-action-btn mgmt-action-btn-danger" onClick={() => handleSetStatus(j._id, JOB_STATUS.REJECTED)} disabled={loadingThis}>Reject</button>
                        </>
                      )}
                      <button type="button" className="mgmt-action-btn mgmt-action-btn-danger" onClick={() => setDeleteJob(j)} title="Delete">Delete</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </DataTable>

      <Pagination
        page={pagination.page}
        pages={pagination.pages}
        total={pagination.total}
        limit={pagination.limit}
        onPrevious={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
        onNext={() => setPagination((p) => ({ ...p, page: Math.min(p.pages || 1, p.page + 1) }))}
      />

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
          onCancel={() => setDeleteJob(null)}
          loading={submitting}
          variant="danger"
        />
      )}
    </div>
  )
}
