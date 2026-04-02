import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { paymentApi } from '../../services/api'
import { getErrorMessage } from '../../utils/format'
import { isMongoObjectIdString } from '../../utils/mongoId'
import { PAGE_SIZE } from './paymentsShared'

const PaymentsAdminContext = createContext(null)

function pathRefreshesTransactions() {
  return typeof window !== 'undefined' && window.location.pathname.includes('/payments/transactions')
}

function pathRefreshesDisputes() {
  return typeof window !== 'undefined' && window.location.pathname.includes('/payments/disputes')
}

export function PaymentsAdminProvider({ children }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const jobIdFromUrl = searchParams.get('jobId') || ''

  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState('')

  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [payoutFilter, setPayoutFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [jobIdFilter, setJobIdFilter] = useState(jobIdFromUrl)
  const [triggerLoading, setTriggerLoading] = useState(false)
  const [retryFailedLoading, setRetryFailedLoading] = useState(false)
  const [retryingPaymentId, setRetryingPaymentId] = useState(null)
  const [disputeModal, setDisputeModal] = useState(null)
  const [disputeLoading, setDisputeLoading] = useState(false)
  const [disputeResolutionNotes, setDisputeResolutionNotes] = useState('')
  const [disputeNotesModal, setDisputeNotesModal] = useState(null)
  const [disputeNotesDraft, setDisputeNotesDraft] = useState('')
  const [disputeNotesLoading, setDisputeNotesLoading] = useState(false)

  const [disputeRows, setDisputeRows] = useState([])
  const [disputePagination, setDisputePagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 0,
  })
  const [disputeListLoading, setDisputeListLoading] = useState(false)
  const [disputeStatusFilter, setDisputeStatusFilter] = useState('all')
  const [disputeJobFilter, setDisputeJobFilter] = useState('')
  const [disputeStartDate, setDisputeStartDate] = useState('')
  const [disputeEndDate, setDisputeEndDate] = useState('')

  useEffect(() => {
    if (!disputeModal) setDisputeResolutionNotes('')
  }, [disputeModal])

  useEffect(() => {
    if (!disputeNotesModal) setDisputeNotesDraft('')
  }, [disputeNotesModal])

  useEffect(() => {
    if (jobIdFromUrl) setJobIdFilter(jobIdFromUrl)
  }, [jobIdFromUrl])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError('')
    try {
      const res = await paymentApi.getDashboardStats()
      setStats(res?.data || null)
    } catch (err) {
      setStatsError(getErrorMessage(err, 'Failed to load payment stats'))
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchList = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError('')
      setSuccess('')
      const trimmedJob = jobIdFilter.trim()
      if (trimmedJob && !isMongoObjectIdString(trimmedJob)) {
        setError('Job ID must be 24 hex characters (copy from the job URL).')
        setRows([])
        setPagination((p) => ({ ...p, total: 0, pages: 0 }))
        setLoading(false)
        return
      }
      try {
        const res = await paymentApi.listAdminAll({
          page, limit: PAGE_SIZE,
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
        setPagination((p) => ({ ...p, page: currentPage, total, pages: pages || (total ? Math.ceil(total / p.limit) : 0) }))
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

  const fetchDisputeList = useCallback(
    async (page = 1) => {
      setDisputeListLoading(true)
      setError('')
      const trimmedJob = disputeJobFilter.trim()
      if (trimmedJob && !isMongoObjectIdString(trimmedJob)) {
        setError('Job ID must be 24 hex characters (copy from the job URL).')
        setDisputeRows([])
        setDisputePagination((p) => ({ ...p, total: 0, pages: 0 }))
        setDisputeListLoading(false)
        return
      }
      try {
        const res = await paymentApi.listAdminDisputes({
          page,
          limit: PAGE_SIZE,
          disputeStatus: disputeStatusFilter,
          jobId: trimmedJob || undefined,
          startDate: disputeStartDate || undefined,
          endDate: disputeEndDate || undefined,
        })
        const list = Array.isArray(res?.data) ? res.data : []
        const total = typeof res?.total === 'number' ? res.total : 0
        const pages = typeof res?.pages === 'number' ? res.pages : 0
        const currentPage = typeof res?.page === 'number' ? res.page : page
        setDisputeRows(list)
        setDisputePagination((p) => ({
          ...p,
          page: currentPage,
          total,
          pages: pages || (total ? Math.ceil(total / p.limit) : 0),
        }))
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load disputes'))
        setDisputePagination((p) => ({ ...p, total: 0, pages: 0 }))
        setDisputeRows([])
      } finally {
        setDisputeListLoading(false)
      }
    },
    [disputeStatusFilter, disputeJobFilter, disputeStartDate, disputeEndDate]
  )

  useEffect(() => { fetchStats() }, [fetchStats])

  const handleTriggerPayouts = async () => {
    setTriggerLoading(true); setError(''); setSuccess('')
    try {
      const res = await paymentApi.triggerPayouts()
      const data = res?.data ?? res
      setSuccess(`Payout run finished: ${data?.processed ?? 0} processed, ${data?.failed ?? 0} failed.`)
      await fetchStats()
      if (pathRefreshesTransactions()) await fetchList(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Trigger payouts failed'))
    } finally {
      setTriggerLoading(false)
    }
  }

  const handleRetryFailedPayoutsBatch = async () => {
    setRetryFailedLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await paymentApi.retryFailedPayoutsBatch()
      const d = res?.data ?? res
      setSuccess(
        `Failed payout retry batch: ${d?.found ?? 0} eligible, ${d?.succeeded ?? 0} submitted to Razorpay, ${d?.failed ?? 0} still failing.`
      )
      await fetchStats()
      if (pathRefreshesTransactions()) await fetchList(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Retry failed payouts failed'))
    } finally {
      setRetryFailedLoading(false)
    }
  }

  const handleRetryOnePayout = async (paymentId) => {
    setRetryingPaymentId(paymentId)
    setError('')
    setSuccess('')
    try {
      await paymentApi.retryPayout(paymentId)
      setSuccess('Payout re-submitted. If it stays on failed, check Razorpay / worker bank details.')
      await fetchStats()
      await fetchList(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Retry payout failed'))
    } finally {
      setRetryingPaymentId(null)
    }
  }

  const confirmResolveDispute = async () => {
    if (!disputeModal) return
    setDisputeLoading(true)
    try {
      const res = await paymentApi.resolveDispute(
        disputeModal.payment._id,
        disputeModal.disputeStatus || 'resolved_worker',
        disputeResolutionNotes.trim() || undefined
      )
      const n = typeof res?.resolvedCount === 'number' ? res.resolvedCount : 1
      setDisputeModal(null)
      setSuccess(`Dispute updated — ${n} payment row(s) updated.`)
      await fetchStats()
      if (pathRefreshesTransactions()) await fetchList(pagination.page)
      if (pathRefreshesDisputes()) await fetchDisputeList(disputePagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Resolve dispute failed'))
    } finally {
      setDisputeLoading(false)
    }
  }

  const openDisputeNotesEditor = (p) => {
    setError('')
    setDisputeNotesDraft(p.dispute?.resolutionNotes || '')
    setDisputeNotesModal({ payment: p })
  }

  const saveDisputeNotes = async () => {
    if (!disputeNotesModal) return
    setDisputeNotesLoading(true)
    setError('')
    try {
      await paymentApi.updateDisputeNotes(
        disputeNotesModal.payment._id,
        disputeNotesDraft
      )
      setDisputeNotesModal(null)
      setSuccess('Dispute notes saved.')
      await fetchStats()
      if (pathRefreshesTransactions()) await fetchList(pagination.page)
      if (pathRefreshesDisputes()) await fetchDisputeList(disputePagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save dispute notes'))
    } finally {
      setDisputeNotesLoading(false)
    }
  }

  const value = useMemo(
    () => ({
      navigate,
      stats,
      statsLoading,
      statsError,
      fetchStats,
      rows,
      pagination,
      setPagination,
      loading,
      error,
      success,
      setError,
      setSuccess,
      statusFilter,
      setStatusFilter,
      payoutFilter,
      setPayoutFilter,
      startDate,
      setStartDate,
      endDate,
      setEndDate,
      jobIdFilter,
      setJobIdFilter,
      triggerLoading,
      retryFailedLoading,
      retryingPaymentId,
      disputeModal,
      setDisputeModal,
      disputeLoading,
      disputeResolutionNotes,
      setDisputeResolutionNotes,
      disputeNotesModal,
      setDisputeNotesModal,
      disputeNotesDraft,
      setDisputeNotesDraft,
      disputeNotesLoading,
      disputeRows,
      disputePagination,
      setDisputePagination,
      disputeListLoading,
      disputeStatusFilter,
      setDisputeStatusFilter,
      disputeJobFilter,
      setDisputeJobFilter,
      disputeStartDate,
      setDisputeStartDate,
      disputeEndDate,
      setDisputeEndDate,
      fetchList,
      fetchDisputeList,
      handleTriggerPayouts,
      handleRetryFailedPayoutsBatch,
      handleRetryOnePayout,
      confirmResolveDispute,
      openDisputeNotesEditor,
      saveDisputeNotes,
    }),
    [
      navigate,
      stats,
      statsLoading,
      statsError,
      fetchStats,
      rows,
      pagination,
      loading,
      error,
      success,
      statusFilter,
      payoutFilter,
      startDate,
      endDate,
      jobIdFilter,
      triggerLoading,
      retryFailedLoading,
      retryingPaymentId,
      disputeModal,
      disputeLoading,
      disputeResolutionNotes,
      disputeNotesModal,
      disputeNotesDraft,
      disputeNotesLoading,
      disputeRows,
      disputePagination,
      disputeListLoading,
      disputeStatusFilter,
      disputeJobFilter,
      disputeStartDate,
      disputeEndDate,
      fetchList,
      fetchDisputeList,
    ]
  )

  return (
    <PaymentsAdminContext.Provider value={value}>
      {children}
    </PaymentsAdminContext.Provider>
  )
}

export function usePaymentsAdmin() {
  const ctx = useContext(PaymentsAdminContext)
  if (!ctx) throw new Error('usePaymentsAdmin must be used under PaymentsAdminProvider')
  return ctx
}
