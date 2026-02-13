import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { workersApi } from '../services/api'
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
import ConfirmModal from '../components/ConfirmModal'
import '../styles/ManagementPage.css'

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
  const [deleteWorker, setDeleteWorker] = useState(null)
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

  const handleDeleteConfirm = async () => {
    if (!deleteWorker) return
    setSubmitting(true)
    try {
      await workersApi.delete(deleteWorker._id)
      setDeleteWorker(null)
      fetchWorkers(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Delete failed'))
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
        extraButton={<Button onClick={() => fetchWorkers(1)}>More Filters</Button>}
      />

      {error && <Alert>{error}</Alert>}

      <DataTable loading={loading} loadingMessage="Loading workers…" emptyColSpan={6}>
        {!loading && (
          <table className="mgmt-table">
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Select all" /></th>
                <th>WORKER</th>
                <th>LOCATION</th>
                <th>VERIFICATION</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.length === 0 ? (
                <TableEmptyRow colSpan={6} message="No workers found" />
              ) : (
                filteredWorkers.map((w) => {
                  const loc = Array.isArray(w.address) && w.address[0]
                    ? [w.address[0].city, w.address[0].state].filter(Boolean).join(', ')
                    : '-'
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
                        <TableActionButtons
                          onView={() => navigate(`/workers/${w._id}`)}
                          onEdit={() => setEditWorker(w)}
                          onDelete={() => setDeleteWorker(w)}
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
      {deleteWorker && (
        <ConfirmModal
          title="Delete Worker"
          message={`Are you sure you want to delete this worker? (${deleteWorker.fullName || deleteWorker.phone || deleteWorker._id})`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteWorker(null)}
          loading={submitting}
          variant="danger"
        />
      )}
    </div>
  )
}
