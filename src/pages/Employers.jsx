import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { employersApi } from '../services/api'
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
import EmployerForm from '../components/EmployerForm'
import EmployerView from '../components/EmployerView'
import ConfirmModal from '../components/ConfirmModal'
import '../styles/ManagementPage.css'

export default function Employers() {
  const [employers, setEmployers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [kycFilter, setKycFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editEmployer, setEditEmployer] = useState(null)
  const [viewEmployer, setViewEmployer] = useState(null)
  const [deleteEmployer, setDeleteEmployer] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const navigate = useNavigate()

  const fetchEmployers = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await employersApi.list({ page, limit: 10, search: search.trim() || undefined })
      const data = res.data || res
      setEmployers(data.employers || [])
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 0 })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load employers'))
      setEmployers([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchEmployers(pagination.page)
  }, [fetchEmployers, pagination.page])

  const filteredEmployers = kycFilter
    ? employers.filter((e) => (e.kyc?.status || '') === kycFilter)
    : employers

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPagination((p) => ({ ...p, page: 1 }))
    fetchEmployers(1)
  }

  const handleCreate = async (values) => {
    setFormError('')
    setSubmitting(true)
    try {
      await employersApi.create(values)
      setCreateOpen(false)
      fetchEmployers(pagination.page)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Create failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (employerId, values) => {
    setFormError('')
    setSubmitting(true)
    try {
      await employersApi.update(employerId, values)
      setEditEmployer(null)
      fetchEmployers(pagination.page)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Update failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteEmployer) return
    setSubmitting(true)
    try {
      await employersApi.delete(deleteEmployer._id)
      setDeleteEmployer(null)
      fetchEmployers(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Delete failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const totalVerified = employers.filter((e) => e.kyc?.status === 'APPROVED').length
  const totalPending = employers.filter((e) => e.kyc?.status === 'PENDING').length
  const totalRejected = employers.filter((e) => e.kyc?.status === 'REJECTED').length

  return (
    <div className="mgmt-page">
      <PageHeader
        title="Employer Management"
        subtitle="Manage company accounts and verify KYC"
        primaryAction={<Button variant="primary" onClick={() => setCreateOpen(true)}>Add Employer</Button>}
        secondaryAction={<Button disabled>Export</Button>}
      />

      <div className="mgmt-cards">
        <SummaryCard value={pagination.total ?? employers.length} label="Total Employers" />
        <SummaryCard
          value={totalVerified}
          label="Verified (KYC)"
          meta={employers.length ? `${Math.round((totalVerified / employers.length) * 100)}% verified` : undefined}
          metaVariant="positive"
        />
        <SummaryCard value={totalPending} label="Pending Review" meta="Needs action" metaVariant="warning" />
        <SummaryCard value={totalRejected} label="Rejected" />
      </div>

      <SearchToolbar
        searchValue={search}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        searchPlaceholder="Search by name, email, or phone..."
        filterOptions={KYC_FILTER_OPTIONS}
        filterValue={kycFilter}
        onFilterChange={setKycFilter}
        extraButton={<Button onClick={() => fetchEmployers(1)}>More Filters</Button>}
      />

      {error && <Alert>{error}</Alert>}

      <DataTable loading={loading} loadingMessage="Loading employers…" emptyColSpan={6}>
        {!loading && (
          <table className="mgmt-table">
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Select all" /></th>
                <th>NAME</th>
                <th>LOCATION</th>
                <th>VERIFICATION</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployers.length === 0 ? (
                <TableEmptyRow colSpan={6} message="No employers found" />
              ) : (
                filteredEmployers.map((e) => {
                  const loc = Array.isArray(e.address) && e.address[0]
                    ? [e.address[0].city, e.address[0].state].filter(Boolean).join(', ')
                    : '-'
                  return (
                    <tr key={e._id}>
                      <td><input type="checkbox" aria-label={`Select ${e.fullName || e.businessName || e.companyName}`} /></td>
                      <td>
                        <UserCell
                          primary={e.fullName || e.businessName || e.companyName || '-'}
                          secondary={e.phone || e.email || '-'}
                          nameOrEmail={e.fullName || e.contactPersonName}
                          onClick={() => navigate(`/employers/${e._id}`)}
                        />
                      </td>
                      <td>{loc}</td>
                      <td><span className={getKycBadgeClass(e.kyc?.status)}>{kycLabel(e.kyc?.status)}</span></td>
                      <td><span className="mgmt-badge mgmt-status-availability">{e.availabilityStatus || '-'}</span></td>
                      <td>
                        <TableActionButtons
                          onView={() => navigate(`/employers/${e._id}`)}
                          onEdit={() => setEditEmployer(e)}
                          onDelete={() => setDeleteEmployer(e)}
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
        <EmployerForm
          title="Add Employer"
          onSubmit={handleCreate}
          onClose={() => { setCreateOpen(false); setFormError(''); }}
          error={formError}
          submitting={submitting}
          mode="create"
        />
      )}
      {editEmployer && (
        <EmployerForm
          title="Edit Employer"
          employer={editEmployer}
          onSubmit={(values) => handleUpdate(editEmployer._id, values)}
          onClose={() => { setEditEmployer(null); setFormError(''); }}
          error={formError}
          submitting={submitting}
          mode="edit"
        />
      )}
      {/* Detail view moved to standalone /employers/:employerId page */}
      {deleteEmployer && (
        <ConfirmModal
          title="Delete Employer"
          message={`Are you sure you want to delete this employer? (${deleteEmployer.fullName || deleteEmployer.businessName || deleteEmployer.companyName || deleteEmployer.phone || deleteEmployer._id})`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteEmployer(null)}
          loading={submitting}
          variant="danger"
        />
      )}
    </div>
  )
}
