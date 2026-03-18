import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { employersApi, usersApi } from '../services/api'
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
import InactiveDateModal from '../components/InactiveDateModal'
import BlockMessageModal from '../components/BlockMessageModal'
import '../styles/ManagementPage.css'

function getUserId(employer) {
  const u = employer?.userId
  return u && (typeof u === 'object' ? u._id : u)
}

function getAccountStatus(employer) {
  if (employer?.isBlocked) return { label: 'Suspended', statusKey: 'suspended' }
  if (employer?.isActive !== false) return { label: 'Active', statusKey: 'active' }
  return { label: 'Inactive', statusKey: 'inactive' }
}

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
  const [blockEmployer, setBlockEmployer] = useState(null)
  const [blockError, setBlockError] = useState('')
  const [inactiveModalEmployer, setInactiveModalEmployer] = useState(null)
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

  const handleBlockConfirm = async (payload) => {
    if (!blockEmployer) return
    const userId = getUserId(blockEmployer)
    if (!userId) return
    setSubmitting(true)
    setBlockError('')
    try {
      await usersApi.update(userId, {
        isBlocked: true,
        inactiveMessage: payload?.blockMessage ?? '',
      })
      setBlockEmployer(null)
      setBlockError('')
      fetchEmployers(pagination.page)
    } catch (err) {
      setBlockError(getErrorMessage(err, 'Block failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnblock = async (employer) => {
    const userId = getUserId(employer)
    if (!userId) return
    setSubmitting(true)
    try {
      await usersApi.update(userId, { isBlocked: false })
      fetchEmployers(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Unblock failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetInactive = async (userId, payload) => {
    setFormError('')
    setSubmitting(true)
    try {
      const inactiveFrom = payload.inactiveFrom ? new Date(payload.inactiveFrom).toISOString() : null
      const inactiveTo = payload.inactiveTo ? new Date(payload.inactiveTo).toISOString() : null
      await usersApi.update(userId, { isActive: false, inactiveFrom, inactiveTo, inactiveMessage: payload.inactiveMessage || '' })
      setInactiveModalEmployer(null)
      fetchEmployers(pagination.page)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Set inactive failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetActive = async (employer) => {
    const userId = getUserId(employer)
    if (!userId) return
    setFormError('')
    setSubmitting(true)
    try {
      await usersApi.update(userId, { isActive: true, inactiveFrom: null, inactiveTo: null, inactiveMessage: '' })
      fetchEmployers(pagination.page)
    } catch (err) {
      setError(getErrorMessage(err, 'Set active failed'))
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
        onRefresh={() => fetchEmployers(pagination.page)}
        refreshing={loading}
        extraButton={<Button onClick={() => fetchEmployers(1)}>More Filters</Button>}
      />

      {error && <Alert>{error}</Alert>}

      <DataTable loading={loading} loadingMessage="Loading employers…" emptyColSpan={8}>
        {!loading && (
          <table className="mgmt-table">
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Select all" /></th>
                <th>NAME</th>
                <th>LOCATION</th>
                <th>VERIFICATION</th>
                <th>STATUS</th>
                <th>ACCOUNT</th>
                <th>JOINED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployers.length === 0 ? (
                <TableEmptyRow colSpan={8} message="No employers found" />
              ) : (
                filteredEmployers.map((e) => {
                  const loc = Array.isArray(e.address) && e.address[0]
                    ? [e.address[0].city, e.address[0].state].filter(Boolean).join(', ')
                    : '-'
                  const accountStatus = getAccountStatus(e)
                  const isActive = e.isActive !== false && !e.isBlocked
                  return (
                    <tr key={e._id}>
                      <td><input type="checkbox" aria-label={`Select ${e.fullName || e.businessName || e.companyName}`} /></td>
                      <td>
                        <UserCell
                          primary={e.fullName || e.businessName || e.companyName || '-'}
                          secondary={e.phone || e.email || '-'}
                          nameOrEmail={e.fullName || e.businessName || e.companyName}
                          onClick={() => navigate(`/employers/${e._id}`)}
                        />
                      </td>
                      <td>{loc}</td>
                      <td><span className={getKycBadgeClass(e.kyc?.status)}>{kycLabel(e.kyc?.status)}</span></td>
                      <td><span className="mgmt-badge mgmt-status-availability">{e.availabilityStatus || '-'}</span></td>
                      <td>
                        <label className="mgmt-toggle-wrap">
                          <input
                            type="checkbox"
                            className="mgmt-switch-input"
                            checked={isActive}
                            onChange={() => {
                              if (isActive) setInactiveModalEmployer(e)
                              else handleSetActive(e)
                            }}
                            disabled={e.isBlocked}
                            aria-label={isActive ? 'Active' : 'Inactive'}
                          />
                          <span className="mgmt-switch-track" aria-hidden="true">
                            <span className="mgmt-switch-thumb" />
                          </span>
                          <span className="mgmt-toggle-label">{accountStatus.label}</span>
                        </label>
                      </td>
                      <td>{e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                      <td>
                        <TableActionButtons
                          onView={() => navigate(`/employers/${e._id}`)}
                          onEdit={() => setEditEmployer(e)}
                          onBlock={!e.isBlocked ? () => { setBlockError(''); setBlockEmployer(e) } : undefined}
                          onUnblock={e.isBlocked ? () => handleUnblock(e) : undefined}
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
      {blockEmployer && (
        <BlockMessageModal
          title="Block employer"
          entityLabel={blockEmployer.fullName || blockEmployer.businessName || blockEmployer.companyName || String(blockEmployer._id)}
          onSubmit={handleBlockConfirm}
          onCancel={() => { setBlockEmployer(null); setBlockError(''); }}
          submitting={submitting}
          error={blockError}
        />
      )}
      {inactiveModalEmployer && (
        <InactiveDateModal
          user={inactiveModalEmployer}
          onSubmit={(payload) => handleSetInactive(getUserId(inactiveModalEmployer), payload)}
          onCancel={() => { setInactiveModalEmployer(null); setFormError(''); }}
          submitting={submitting}
          error={formError}
        />
      )}
    </div>
  )
}
