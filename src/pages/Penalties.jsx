import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { penaltiesApi, jobsApi } from '../services/api'
import { getErrorMessage, formatAdminDateTime } from '../utils/format'
import { isMongoObjectIdString } from '../utils/mongoId'
import {
  PENALTY_STATUS,
  PENALTY_STATUS_OPTIONS,
  penaltyStatusLabel,
  penaltyStatusBadgeClass,
  penaltyReasonLabel,
  penaltyPayerLabel,
} from '../constants/penaltyEnums'
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
import ConfirmModal from '../components/ConfirmModal'
import WaivePenaltyModal from '../components/WaivePenaltyModal'
import '../styles/ManagementPage.css'

function formatCurrency(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—'
}

const OPEN_STATUSES = [PENALTY_STATUS.PENDING, PENALTY_STATUS.DUE]

export default function Penalties() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const jobIdFromUrl = searchParams.get('jobId') || ''

  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [jobIdFilter, setJobIdFilter] = useState(jobIdFromUrl)

  const [settleTarget, setSettleTarget] = useState(null)
  const [waiveTarget, setWaiveTarget] = useState(null)
  const [waiveNote, setWaiveNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (jobIdFromUrl) setJobIdFilter(jobIdFromUrl)
  }, [jobIdFromUrl])

  const fetchList = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError('')
      const trimmedJob = jobIdFilter.trim()
      if (trimmedJob && !isMongoObjectIdString(trimmedJob)) {
        setError('Job ID must be 24 hex characters (copy from the job URL, e.g. /jobs/507f1f77bcf86cd799439011).')
        setRows([])
        setPagination((p) => ({ ...p, total: 0, pages: 0 }))
        setLoading(false)
        return
      }
      try {
        const res = await penaltiesApi.list({
          page,
          limit: 15,
          status: statusFilter || undefined,
          jobId: trimmedJob || undefined,
        })
        const payload = res?.data ?? res
        const list = payload?.penalties ?? []
        const pag = payload?.pagination ?? { page: 1, limit: 15, total: 0, pages: 0 }
        setRows(Array.isArray(list) ? list : [])
        setPagination({
          ...pag,
          page: pag.page ?? 1,
          limit: pag.limit ?? 15,
          total: pag.total ?? 0,
          pages: pag.pages ?? 0,
        })
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load penalties'))
        setPagination((p) => ({ ...p, total: 0, pages: 0 }))
        setRows([])
      } finally {
        setLoading(false)
      }
    },
    [statusFilter, jobIdFilter]
  )

  useEffect(() => {
    fetchList(pagination.page)
  }, [fetchList, pagination.page])

  const handleSettleConfirm = async () => {
    if (!settleTarget) return
    setActionLoading(true)
    try {
      await jobsApi.settlePenalty(settleTarget._id)
      setSettleTarget(null)
      fetchList(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Mark paid failed'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleWaiveConfirm = async () => {
    if (!waiveTarget) return
    setActionLoading(true)
    try {
      await penaltiesApi.waive(waiveTarget._id, { messageNote: waiveNote.trim() || undefined })
      setWaiveTarget(null)
      setWaiveNote('')
      fetchList(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Waive failed'))
    } finally {
      setActionLoading(false)
    }
  }

  const openCount = rows.filter((r) => OPEN_STATUSES.includes(r.status)).length

  return (
    <div className="mgmt-page">
      <PageHeader
        title="Job penalties"
        subtitle="Ledger for worker/employer penalties tied to jobs (withdraw after hire, remove hire, disable after hire). Mark paid or waive for support."
        secondaryAction={<Button onClick={() => navigate('/jobs')}>← Jobs</Button>}
      />

      <div className="mgmt-cards">
        <SummaryCard
          value={loading ? '…' : pagination.total}
          label="Penalties (this filter)"
          meta={openCount > 0 ? `${openCount} open on this page` : undefined}
          metaVariant={openCount > 0 ? 'warning' : undefined}
        />
      </div>

      <SearchToolbar
        searchValue={jobIdFilter}
        onSearchChange={setJobIdFilter}
        onSearchSubmit={(e) => {
          e.preventDefault()
          setPagination((p) => ({ ...p, page: 1 }))
          fetchList(1)
        }}
        searchPlaceholder="Filter by job MongoDB id…"
        filterOptions={PENALTY_STATUS_OPTIONS}
        filterValue={statusFilter}
        onFilterChange={(v) => {
          setStatusFilter(v)
          setPagination((p) => ({ ...p, page: 1 }))
        }}
        filterLabel="Status"
        onRefresh={() => fetchList(pagination.page)}
        refreshing={loading}
      />

      {error && <Alert variant="error" className="mgmt-alert">{error}</Alert>}

      <DataTable loading={loading} loadingMessage="Loading penalties…" emptyColSpan={9}>
        <table className="mgmt-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Worker</th>
              <th>Payer</th>
              <th>Reason</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Blocking</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && !error && (
              <TableEmptyRow colSpan={9} message="No penalties present." />
            )}
            {rows.map((p) => {
              const job = p.jobId
              const jobRef = job && (job._id || job)
              const jobTitle = job?.jobTitle || '—'
              const w = p.workerId
              const wid = w?._id || w
              const canAct = OPEN_STATUSES.includes(p.status)
              return (
                <tr key={p._id}>
                  <td>
                    {jobRef ? (
                      <button type="button" className="mgmt-link" onClick={() => navigate(`/jobs/${jobRef}`)}>
                        {jobTitle}
                      </button>
                    ) : (
                      jobTitle
                    )}
                  </td>
                  <td>
                    {wid ? (
                      <button type="button" className="mgmt-link" onClick={() => navigate(`/workers/${wid}`)}>
                        {w?.fullName || w?.phoneNumber || wid}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{penaltyPayerLabel(p.payerType)}</td>
                  <td>{penaltyReasonLabel(p.reason)}</td>
                  <td>{formatCurrency(p.amount)}</td>
                  <td>
                    <span className={`mgmt-badge ${penaltyStatusBadgeClass(p.status)}`}>
                      {penaltyStatusLabel(p.status)}
                    </span>
                  </td>
                  <td>{p.mustPayBeforeUnlock ? 'Yes' : '—'}</td>
                  <td>{formatAdminDateTime(p.createdAt)}</td>
                  <td>
                    <div className="mgmt-actions-cell">
                      {jobRef && (
                        <button type="button" className="mgmt-action-btn" onClick={() => navigate(`/jobs/${jobRef}`)}>
                          Job
                        </button>
                      )}
                      {canAct && (
                        <>
                          <button
                            type="button"
                            className="mgmt-action-btn mgmt-action-btn-success"
                            onClick={() => setSettleTarget(p)}
                          >
                            Mark paid
                          </button>
                          <button
                            type="button"
                            className="mgmt-action-btn"
                            onClick={() => { setWaiveTarget(p); setWaiveNote('') }}
                          >
                            Waive
                          </button>
                        </>
                      )}
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

      {settleTarget && (
        <ConfirmModal
          title="Mark penalty paid"
          message={`Record ₹${Number(settleTarget.amount || 0).toLocaleString('en-IN')} as paid for ${penaltyReasonLabel(settleTarget.reason)}? This mirrors employer settlement rules on the server.`}
          confirmLabel="Mark paid"
          onConfirm={handleSettleConfirm}
          onCancel={() => setSettleTarget(null)}
          loading={actionLoading}
          variant="primary"
        />
      )}

      {waiveTarget && (
        <WaivePenaltyModal
          note={waiveNote}
          onNoteChange={setWaiveNote}
          onConfirm={handleWaiveConfirm}
          onCancel={() => { setWaiveTarget(null); setWaiveNote('') }}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
