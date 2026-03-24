import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { paymentApi } from '../services/api'
import { getErrorMessage, formatAdminDateTime } from '../utils/format'
import { isMongoObjectIdString } from '../utils/mongoId'
import {
  PAYMENT_STATUS_OPTIONS,
  PAYOUT_STATUS_OPTIONS,
  paymentStatusLabel,
  payoutStatusLabel,
  paymentStatusBadgeClass,
  payoutStatusBadgeClass,
  disputeStatusLabel,
} from '../constants/paymentEnums'
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
import '../styles/ManagementPage.css'

function formatCurrency(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—'
}

const PAGE_SIZE = 20

export default function Payments() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const jobIdFromUrl = searchParams.get('jobId') || ''

  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [payoutFilter, setPayoutFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [jobIdFilter, setJobIdFilter] = useState(jobIdFromUrl)
  const [triggerLoading, setTriggerLoading] = useState(false)
  const [disputeModal, setDisputeModal] = useState(null)
  const [disputeLoading, setDisputeLoading] = useState(false)

  useEffect(() => {
    if (jobIdFromUrl) setJobIdFilter(jobIdFromUrl)
  }, [jobIdFromUrl])

  const fetchList = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError('')
      setSuccess('')
      const trimmedJob = jobIdFilter.trim()
      if (trimmedJob && !isMongoObjectIdString(trimmedJob)) {
        setError(
          'Job ID must be 24 hex characters (copy from the job URL, e.g. /jobs/507f1f77bcf86cd799439011).'
        )
        setRows([])
        setPagination((p) => ({ ...p, total: 0, pages: 0 }))
        setLoading(false)
        return
      }
      try {
        const res = await paymentApi.listAdminAll({
          page,
          limit: PAGE_SIZE,
          status: statusFilter || undefined,
          payoutStatus: payoutFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          jobId: trimmedJob || undefined,
        })
        const list = Array.isArray(res?.data) ? res.data : []
        const total = typeof res?.total === 'number' ? res.total : 0
        const pages = typeof res?.pages === 'number' ? res.pages : 0
        const currentPage = typeof res?.page === 'number' ? res.page : page
        setRows(list)
        setPagination((p) => ({
          ...p,
          page: currentPage,
          total,
          pages: pages || (total ? Math.ceil(total / p.limit) : 0),
        }))
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load payments'))
        setPagination((p) => ({ ...p, total: 0, pages: 0 }))
        setRows([])
      } finally {
        setLoading(false)
      }
    },
    [statusFilter, payoutFilter, startDate, endDate, jobIdFilter]
  )

  useEffect(() => {
    fetchList(pagination.page)
  }, [fetchList, pagination.page])

  const handleTriggerPayouts = async () => {
    setTriggerLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await paymentApi.triggerPayouts()
      const data = res?.data ?? res
      const processed = data?.processed ?? 0
      const failed = data?.failed ?? 0
      setSuccess(`Payout run finished: ${processed} processed, ${failed} failed.`)
      fetchList(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Trigger payouts failed'))
    } finally {
      setTriggerLoading(false)
    }
  }

  const confirmResolveDispute = async () => {
    if (!disputeModal) return
    setDisputeLoading(true)
    try {
      await paymentApi.resolveDispute(disputeModal.payment._id, disputeModal.resolution)
      setDisputeModal(null)
      fetchList(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Resolve dispute failed'))
    } finally {
      setDisputeLoading(false)
    }
  }

  const openDisputesOnPage = rows.filter((r) => r.dispute?.status === 'open').length

  return (
    <div className="mgmt-page">
      <PageHeader
        title="Payments"
        subtitle="Employer collections and worker payouts (Razorpay). Filter by status, payout, dates, or job. Resolve disputes and run the payout job when needed."
        secondaryAction={<Button onClick={() => navigate('/jobs')}>← Jobs</Button>}
      />

      <div className="mgmt-cards">
        <SummaryCard
          value={loading ? '…' : pagination.total}
          label="Payments (this filter)"
          meta={openDisputesOnPage > 0 ? `${openDisputesOnPage} open dispute(s) on this page` : undefined}
          metaVariant={openDisputesOnPage > 0 ? 'warning' : undefined}
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
        onRefresh={() => fetchList(pagination.page)}
        refreshing={loading}
        extraButton={
          <Button variant="secondary" onClick={handleTriggerPayouts} disabled={triggerLoading || loading}>
            {triggerLoading ? 'Running payouts…' : 'Run payout job'}
          </Button>
        }
      />

      <div className="mgmt-toolbar" style={{ flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <select
          className="mgmt-select"
          aria-label="Payment status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPagination((p) => ({ ...p, page: 1 }))
          }}
        >
          {PAYMENT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || 'all-pay'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className="mgmt-select"
          aria-label="Payout status"
          value={payoutFilter}
          onChange={(e) => {
            setPayoutFilter(e.target.value)
            setPagination((p) => ({ ...p, page: 1 }))
          }}
        >
          {PAYOUT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || 'all-payout'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem' }}>
          From
          <input
            type="date"
            className="mgmt-search-input"
            style={{ width: 'auto' }}
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              setPagination((p) => ({ ...p, page: 1 }))
            }}
          />
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem' }}>
          To
          <input
            type="date"
            className="mgmt-search-input"
            style={{ width: 'auto' }}
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value)
              setPagination((p) => ({ ...p, page: 1 }))
            }}
          />
        </label>
      </div>

      {error && <Alert variant="error" className="mgmt-alert">{error}</Alert>}
      {success && <Alert variant="info" className="mgmt-alert">{success}</Alert>}

      <DataTable loading={loading} loadingMessage="Loading payments…" emptyColSpan={10}>
        <table className="mgmt-table">
          <thead>
            <tr>
              <th>Created</th>
              <th>Job</th>
              <th>Worker</th>
              <th>Employer</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Payout</th>
              <th>Dispute</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && !error && (
              <TableEmptyRow colSpan={10} message="No payments present." />
            )}
            {rows.map((p) => {
              const job = p.jobId
              const jobRef = job && (job._id || job)
              const jobTitle = job?.jobTitle || '—'
              const w = p.workerId
              const wid = w?._id || w
              const u = p.user
              const disputeOpen = p.dispute?.status === 'open'
              return (
                <tr key={p._id}>
                  <td>{formatAdminDateTime(p.createdAt)}</td>
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
                        {w?.fullName || w?.phoneNumber || String(wid).slice(-6)}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{u?.phone || u?.name || '—'}</td>
                  <td>{p.paymentType || '—'}</td>
                  <td>{formatCurrency(p.amount)}</td>
                  <td>
                    <span className={`mgmt-badge ${paymentStatusBadgeClass(p.status)}`}>
                      {paymentStatusLabel(p.status)}
                    </span>
                  </td>
                  <td>
                    <span className={`mgmt-badge ${payoutStatusBadgeClass(p.payoutStatus)}`}>
                      {payoutStatusLabel(p.payoutStatus)}
                    </span>
                  </td>
                  <td>{disputeStatusLabel(p.dispute)}</td>
                  <td>
                    <div className="mgmt-actions-cell">
                      {jobRef && (
                        <button type="button" className="mgmt-action-btn" onClick={() => navigate(`/jobs/${jobRef}`)}>
                          Job
                        </button>
                      )}
                      {disputeOpen && (
                        <>
                          <button
                            type="button"
                            className="mgmt-action-btn mgmt-action-btn-success"
                            onClick={() => setDisputeModal({ payment: p, resolution: 'worker' })}
                          >
                            Dispute → worker
                          </button>
                          <button
                            type="button"
                            className="mgmt-action-btn"
                            onClick={() => setDisputeModal({ payment: p, resolution: 'employer' })}
                          >
                            Dispute → employer
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

      {disputeModal && (
        <ConfirmModal
          title="Resolve dispute"
          message={
            disputeModal.resolution === 'worker'
              ? 'Release payout to the worker and close this dispute?'
              : 'Resolve in favour of the employer (refund path on server)?'
          }
          confirmLabel="Confirm"
          onConfirm={confirmResolveDispute}
          onCancel={() => setDisputeModal(null)}
          loading={disputeLoading}
          variant={disputeModal.resolution === 'employer' ? 'danger' : 'primary'}
        />
      )}
    </div>
  )
}
