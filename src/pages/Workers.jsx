import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { workersApi, usersApi } from '../services/api'
import { KYC_FILTER_OPTIONS } from '../constants/kyc'
import { kycLabel, getKycBadgeClass, getErrorMessage } from '../utils/format'
import {
  PageHeader,
  SummaryCard,
  SearchToolbar,
  DataTable,
  TableEmptyRow,
  UserCell,
  TableActionButtons,
  Pagination,
  Alert,
  Button,
} from '../components/ui'
import WorkerForm from '../components/WorkerForm'
import WorkerView from '../components/WorkerView'
import InactiveDateModal from '../components/InactiveDateModal'
import BlockMessageModal from '../components/BlockMessageModal'
import '../styles/ManagementPage.css'

function getUserId(worker) {
  const u = worker?.userId
  return u && (typeof u === 'object' ? u._id : u)
}

function getAccountStatus(worker) {
  if (worker?.isBlocked) return { label: 'Suspended', statusKey: 'suspended' }
  if (worker?.isActive !== false) return { label: 'Active', statusKey: 'active' }
  return { label: 'Inactive', statusKey: 'inactive' }
}

export default function Workers() {
  const [workers, setWorkers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [kycFilter, setKycFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editWorker, setEditWorker] = useState(null)
  const [viewWorker, setViewWorker] = useState(null)
  const [blockWorker, setBlockWorker] = useState(null)
  const [blockError, setBlockError] = useState('')
  const [inactiveModalWorker, setInactiveModalWorker] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const navigate = useNavigate()

  const fetchWorkers = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await workersApi.list({ page, limit: 10, search: search.trim() || undefined })
      const data = res.data || res
      setWorkers(data.workers || [])
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 0 })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load workers'))
      setWorkers([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchWorkers(pagination.page)
  }, [fetchWorkers, pagination.page])

  const filteredWorkers = kycFilter
    ? workers.filter((w) => (w.kyc?.status || '') === kycFilter)
    : workers

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPagination((p) => ({ ...p, page: 1 }))
    fetchWorkers(1)
  }

  const handleCreate = async (values) => {
    setFormError('')
    setSubmitting(true)
    try {
      await workersApi.create(values)
      setCreateOpen(false)
      fetchWorkers(pagination.page)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Create failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (workerId, values) => {
    setFormError('')
    setSubmitting(true)
    try {
      await workersApi.update(workerId, values)
      setEditWorker(null)
      fetchWorkers(pagination.page)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Update failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleBlockConfirm = async (payload) => {
    if (!blockWorker) return
    const userId = getUserId(blockWorker)
    if (!userId) return
    setSubmitting(true)
    setBlockError('')
    try {
      await usersApi.update(userId, {
        isBlocked: true,
        inactiveMessage: payload?.blockMessage ?? '',
      })
      setBlockWorker(null)
      setBlockError('')
      fetchWorkers(pagination.page)
    } catch (err) {
      setBlockError(getErrorMessage(err, 'Block failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnblock = async (worker) => {
    const userId = getUserId(worker)
    if (!userId) return
    setSubmitting(true)
    try {
      await usersApi.update(userId, { isBlocked: false })
      fetchWorkers(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Unblock failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetInactive = async (workerId, payload) => {
    setFormError('')
    setSubmitting(true)
    try {
      const inactiveFrom = payload.inactiveFrom ? new Date(payload.inactiveFrom).toISOString() : null
      const inactiveTo = payload.inactiveTo ? new Date(payload.inactiveTo).toISOString() : null
      await usersApi.update(workerId, { isActive: false, inactiveFrom, inactiveTo, inactiveMessage: payload.inactiveMessage || '' })
      setInactiveModalWorker(null)
      fetchWorkers(pagination.page)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Set inactive failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetActive = async (worker) => {
    const userId = getUserId(worker)
    if (!userId) return
    setFormError('')
    setSubmitting(true)
    try {
      await usersApi.update(userId, { isActive: true, inactiveFrom: null, inactiveTo: null, inactiveMessage: '' })
      fetchWorkers(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Set active failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const totalVerified = workers.filter((w) => w.kyc?.status === 'APPROVED').length
  const totalPending = workers.filter((w) => w.kyc?.status === 'PENDING').length
  const totalRejected = workers.filter((w) => w.kyc?.status === 'REJECTED').length

  return (
    <div className="mgmt-page">
      <PageHeader
        title="Worker Management"
        subtitle="Manage workers and verify KYC"
        primaryAction={<Button variant="primary" onClick={() => setCreateOpen(true)}>Add Worker</Button>}
        secondaryAction={<Button disabled>Export</Button>}
      />

      <div className="mgmt-cards">
        <SummaryCard value={pagination.total ?? workers.length} label="Total Workers" />
        <SummaryCard
          value={totalVerified}
          label="Verified (KYC)"
          meta={workers.length ? `${Math.round((totalVerified / workers.length) * 100)}% verified` : undefined}
          metaVariant="positive"
        />
        <SummaryCard value={totalPending} label="Pending Review" meta="Needs action" metaVariant="warning" />
        <SummaryCard value={totalRejected} label="Rejected" />
      </div>

      <SearchToolbar
        searchValue={search}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        searchPlaceholder="Search by name, phone, or email..."
        filterOptions={KYC_FILTER_OPTIONS}
        filterValue={kycFilter}
        onFilterChange={setKycFilter}
        onRefresh={() => fetchWorkers(pagination.page)}
        refreshing={loading}
        extraButton={<Button onClick={() => fetchWorkers(1)}>More Filters</Button>}
      />

      {error && <Alert>{error}</Alert>}

      <DataTable loading={loading} loadingMessage="Loading workers…" emptyColSpan={8}>
        {!loading && (
          <table className="mgmt-table">
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Select all" /></th>
                <th>WORKER</th>
                <th>LOCATION</th>
                <th>VERIFICATION</th>
                <th>STATUS</th>
                <th>ACCOUNT</th>
                <th>JOINED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.length === 0 ? (
                <TableEmptyRow colSpan={8} message="No workers found" />
              ) : (
                filteredWorkers.map((w) => {
                  const loc = Array.isArray(w.address) && w.address[0]
                    ? [w.address[0].city, w.address[0].state].filter(Boolean).join(', ')
                    : '-'
                  const accountStatus = getAccountStatus(w)
                  const isActive = w.isActive !== false && !w.isBlocked
                  return (
                    <tr key={w._id}>
                      <td><input type="checkbox" aria-label={`Select ${w.fullName || w.phone}`} /></td>
                      <td>
                        <UserCell
                          primary={w.fullName || '-'}
                          secondary={w.phone || w.email || '-'}
                          nameOrEmail={w.fullName || w.phone}
                          onClick={() => navigate(`/workers/${w._id}`)}
                        />
                      </td>
                      <td>{loc}</td>
                      <td><span className={getKycBadgeClass(w.kyc?.status)}>{kycLabel(w.kyc?.status)}</span></td>
                      <td><span className="mgmt-badge mgmt-status-availability">{w.availabilityStatus || '-'}</span></td>
                      <td>
                        <label className="mgmt-toggle-wrap">
                          <input
                            type="checkbox"
                            className="mgmt-switch-input"
                            checked={isActive}
                            onChange={() => {
                              if (isActive) setInactiveModalWorker(w)
                              else handleSetActive(w)
                            }}
                            disabled={w.isBlocked}
                            aria-label={isActive ? 'Active' : 'Inactive'}
                          />
                          <span className="mgmt-switch-track" aria-hidden="true">
                            <span className="mgmt-switch-thumb" />
                          </span>
                          <span className="mgmt-toggle-label">{accountStatus.label}</span>
                        </label>
                      </td>
                      <td>{w.createdAt ? new Date(w.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                      <td>
                        <TableActionButtons
                          onView={() => navigate(`/workers/${w._id}`)}
                          onEdit={() => setEditWorker(w)}
                          onBlock={!w.isBlocked ? () => { setBlockError(''); setBlockWorker(w) } : undefined}
                          onUnblock={w.isBlocked ? () => handleUnblock(w) : undefined}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </DataTable>

      <Pagination
        page={pagination.page}
        pages={pagination.pages}
        total={pagination.total}
        limit={pagination.limit}
        onPrevious={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
        onNext={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
      />

      {createOpen && (
        <WorkerForm
          title="Add Worker"
          onSubmit={handleCreate}
          onClose={() => { setCreateOpen(false); setFormError(''); }}
          error={formError}
          submitting={submitting}
          mode="create"
        />
      )}
      {editWorker && (
        <WorkerForm
          title="Edit Worker"
          worker={editWorker}
          onSubmit={(values) => handleUpdate(editWorker._id, values)}
          onClose={() => { setEditWorker(null); setFormError(''); }}
          error={formError}
          submitting={submitting}
          mode="edit"
        />
      )}
      {/* Detail view moved to standalone /workers/:workerId page */}
      {blockWorker && (
        <BlockMessageModal
          title="Block worker"
          entityLabel={blockWorker.fullName || blockWorker.phone || String(blockWorker._id)}
          onSubmit={handleBlockConfirm}
          onCancel={() => { setBlockWorker(null); setBlockError(''); }}
          submitting={submitting}
          error={blockError}
        />
      )}
      {inactiveModalWorker && (
        <InactiveDateModal
          user={inactiveModalWorker}
          onSubmit={(payload) => handleSetInactive(getUserId(inactiveModalWorker), payload)}
          onCancel={() => { setInactiveModalWorker(null); setFormError(''); }}
          submitting={submitting}
          error={formError}
        />
      )}
    </div>
  )
}
