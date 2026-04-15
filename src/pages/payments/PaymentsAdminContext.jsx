import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  const payerUserIdFromUrl = searchParams.get('payerUserId') || ''
  const workerIdFromUrl = searchParams.get('workerId') || ''
  const groupByJobFromUrl = searchParams.get('groupByJob') || ''
  const jobEarningsOnlyFromUrl = searchParams.get('jobEarningsOnly') || ''

  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState('')

  const [rows, setRows] = useState([])
  /** Admin: one card per job (GET /payment/admin/all?groupByJob=true) */
  const [jobGroups, setJobGroups] = useState([])
  const [txViewMode, setTxViewMode] = useState(() =>
    groupByJobFromUrl === 'true' || groupByJobFromUrl === '1' ? 'grouped' : 'flat'
  )
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [payoutFilter, setPayoutFilter] = useState('')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [jobIdFilter, setJobIdFilter] = useState(jobIdFromUrl)
  const [payerUserIdFilter, setPayerUserIdFilter] = useState(payerUserIdFromUrl)
  const [workerIdFilter, setWorkerIdFilter] = useState(workerIdFromUrl)
  const [jobEarningsOnlyFilter, setJobEarningsOnlyFilter] = useState(
    () => jobEarningsOnlyFromUrl === 'true' || jobEarningsOnlyFromUrl === '1'
  )
  /** Transactions hub: search box (submitted to API — employer/worker/job/PAY-id) */
  const [txSearchInput, setTxSearchInput] = useState('')
  const [txSearchQuery, setTxSearchQuery] = useState('')
  /** all | failed_payout | open_dispute | pending_cash */
  const [txQuickFilter, setTxQuickFilter] = useState('all')
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

  /** Ignore stale list responses when txViewMode / filters change and triggers overlapping fetches. */
  const listFetchGen = useRef(0)

  useEffect(() => {
    if (!disputeModal) setDisputeResolutionNotes('')
  }, [disputeModal])

  useEffect(() => {
    if (!disputeNotesModal) setDisputeNotesDraft('')
  }, [disputeNotesModal])

  useEffect(() => {
    if (jobIdFromUrl) setJobIdFilter(jobIdFromUrl)
  }, [jobIdFromUrl])

  useEffect(() => {
    if (payerUserIdFromUrl) setPayerUserIdFilter(payerUserIdFromUrl)
  }, [payerUserIdFromUrl])

  useEffect(() => {
    if (workerIdFromUrl) setWorkerIdFilter(workerIdFromUrl)
  }, [workerIdFromUrl])

  useEffect(() => {
    if (groupByJobFromUrl === 'true' || groupByJobFromUrl === '1') {
      setTxViewMode('grouped')
    }
  }, [groupByJobFromUrl])

  useEffect(() => {
    if (jobEarningsOnlyFromUrl === 'true' || jobEarningsOnlyFromUrl === '1') {
      setJobEarningsOnlyFilter(true)
    }
    if (jobEarningsOnlyFromUrl === 'false' || jobEarningsOnlyFromUrl === '0') {
      setJobEarningsOnlyFilter(false)
    }
  }, [jobEarningsOnlyFromUrl])

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
      const gen = ++listFetchGen.current
      const sentGroupByJob = txViewMode === 'grouped'
      setLoading(true)
      setError('')
      setSuccess('')
      const trimmedJob = jobIdFilter.trim()
      const trimmedPayer = payerUserIdFilter.trim()
      const trimmedWorker = workerIdFilter.trim()
      if (trimmedJob && !isMongoObjectIdString(trimmedJob)) {
        setError('Job ID must be 24 hex characters (copy from the job URL).')
        setRows([])
        setJobGroups([])
        setPagination((p) => ({ ...p, total: 0, pages: 0 }))
        if (gen === listFetchGen.current) setLoading(false)
        return
      }
      if (trimmedPayer && !isMongoObjectIdString(trimmedPayer)) {
        setError('Payer user ID must be a valid 24-character Mongo id.')
        setRows([])
        setJobGroups([])
        setPagination((p) => ({ ...p, total: 0, pages: 0 }))
        if (gen === listFetchGen.current) setLoading(false)
        return
      }
      if (trimmedWorker && !isMongoObjectIdString(trimmedWorker)) {
        setError('Worker ID must be a valid 24-character Mongo id.')
        setRows([])
        setJobGroups([])
        setPagination((p) => ({ ...p, total: 0, pages: 0 }))
        if (gen === listFetchGen.current) setLoading(false)
        return
      }
      let effStatus = statusFilter || undefined
      let effPayout = payoutFilter || undefined
      let effType = paymentTypeFilter || undefined
      let effDispute = undefined
      if (txQuickFilter === 'failed_payout') {
        effStatus = 'captured'
        effPayout = 'failed'
        effType = 'ONLINE'
      } else if (txQuickFilter === 'open_dispute') {
        effDispute = 'open'
      } else if (txQuickFilter === 'pending_cash') {
        effType = 'CASH'
        effPayout = 'pending'
      }

      try {
        const res = await paymentApi.listAdminAll({
          page,
          limit: PAGE_SIZE,
          status: effStatus,
          payoutStatus: effPayout,
          paymentType: effType,
          disputeStatus: effDispute,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          jobId: trimmedJob || undefined,
          payerUserId: trimmedPayer || undefined,
          workerId: trimmedWorker || undefined,
          jobEarningsOnly: jobEarningsOnlyFilter,
          groupByJob: sentGroupByJob,
          search: txSearchQuery.trim() || undefined,
        })
        if (gen !== listFetchGen.current) return

        const mode = res?.mode || 'flat'
        const list = Array.isArray(res?.data) ? res.data : []
        const total = typeof res?.total === 'number' ? res.total : 0
        const pages = typeof res?.pages === 'number' ? res.pages : 0
        const currentPage = typeof res?.page === 'number' ? res.page : page

        if (sentGroupByJob && mode !== 'grouped_by_job' && list.length > 0) {
          setTxViewMode('flat')
        }

        if (mode === 'grouped_by_job') {
          setJobGroups(list)
          setRows([])
        } else {
          setRows(list)
          setJobGroups([])
        }
        setPagination((p) => ({
          ...p,
          page: currentPage,
          total,
          pages: pages || (total ? Math.ceil(total / p.limit) : 0),
        }))
      } catch (err) {
        if (gen !== listFetchGen.current) return
        setError(getErrorMessage(err, 'Failed to load payments'))
        setPagination((p) => ({ ...p, total: 0, pages: 0 }))
        setRows([])
        setJobGroups([])
      } finally {
        if (gen === listFetchGen.current) setLoading(false)
      }
    },
    [
      statusFilter,
      payoutFilter,
      paymentTypeFilter,
      startDate,
      endDate,
      jobIdFilter,
      payerUserIdFilter,
      workerIdFilter,
      jobEarningsOnlyFilter,
      txViewMode,
      txSearchQuery,
      txQuickFilter,
    ]
  )

  const submitTxSearch = useCallback(() => {
    setTxSearchQuery(txSearchInput.trim())
    setPagination((p) => ({ ...p, page: 1 }))
  }, [txSearchInput])

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
      paymentTypeFilter,
      setPaymentTypeFilter,
      txViewMode,
      setTxViewMode,
      jobGroups,
      startDate,
      setStartDate,
      endDate,
      setEndDate,
      jobIdFilter,
      setJobIdFilter,
      payerUserIdFilter,
      setPayerUserIdFilter,
      workerIdFilter,
      setWorkerIdFilter,
      jobEarningsOnlyFilter,
      setJobEarningsOnlyFilter,
      txSearchInput,
      setTxSearchInput,
      txSearchQuery,
      setTxSearchQuery,
      txQuickFilter,
      setTxQuickFilter,
      submitTxSearch,
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
      paymentTypeFilter,
      txViewMode,
      jobGroups,
      startDate,
      endDate,
      jobIdFilter,
      payerUserIdFilter,
      workerIdFilter,
      jobEarningsOnlyFilter,
      txSearchInput,
      txSearchQuery,
      txQuickFilter,
      submitTxSearch,
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
