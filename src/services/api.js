import { isMongoObjectIdString } from '../utils/mongoId'

// Use .env VITE_API_URL; fallback for dev so API calls hit backend (e.g. http://localhost:5000)
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : '')

function getAuthToken() {
  return localStorage.getItem('admin_access_token')
}

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const token = getAuthToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { ...options, headers })
  if (res.status === 401) {
    localStorage.removeItem('admin_access_token')
    localStorage.removeItem('admin_refresh_token')
    localStorage.removeItem('admin_user')
    window.dispatchEvent(new Event('auth:logout'))
    // Immediate redirect to login so admin is not left on a protected page
    window.location.replace('/login')
    const err = new Error('Session expired')
    err.status = 401
    throw err
  }
  if (!res.ok) {
    const err = new Error(res.statusText || 'Request failed')
    err.status = res.status
    // Read body once: json() consumes the stream — calling text() after a failed json() throws.
    const text = await res.text()
    try {
      err.body = text ? JSON.parse(text) : null
    } catch {
      err.body = text
    }
    throw err
  }
  const contentType = res.headers.get('content-type')
  if (contentType?.includes('application/json')) return res.json()
  return res.text()
}

// Auth
export const authApi = {
  login: (email, password) =>
    apiRequest('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiRequest('/api/auth/me'),
  logout: (refreshToken) =>
    apiRequest('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: refreshToken || undefined }),
    }),
}

// Admin users
export const usersApi = {
  list: (params = {}) => {
    const sp = new URLSearchParams()
    if (params.page) sp.set('page', params.page)
    if (params.limit) sp.set('limit', params.limit)
    if (params.role) sp.set('role', params.role)
    if (params.search) sp.set('search', params.search)
    const q = sp.toString()
    return apiRequest(`/api/admin/users${q ? `?${q}` : ''}`)
  },
  get: (userId) => apiRequest(`/api/admin/users/${userId}`),
  create: (body) =>
    apiRequest('/api/admin/users', { method: 'POST', body: JSON.stringify(body) }),
  update: (userId, body) =>
    apiRequest(`/api/admin/users/${userId}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (userId) =>
    apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' }),
}

// Admin roles (for dropdowns)
export const rolesApi = {
  list: (params = {}) => {
    const sp = new URLSearchParams()
    if (params.page) sp.set('page', params.page)
    if (params.limit) sp.set('limit', params.limit)
    const q = sp.toString()
    return apiRequest(`/api/admin/roles${q ? `?${q}` : ''}`)
  },
}

// Workers (admin uses /api/worker/workers with admin token)
export const workersApi = {
  list: (params = {}) => {
    const sp = new URLSearchParams()
    if (params.page) sp.set('page', params.page)
    if (params.limit) sp.set('limit', params.limit)
    if (params.search) sp.set('search', params.search)
    const q = sp.toString()
    return apiRequest(`/api/worker/workers${q ? `?${q}` : ''}`)
  },
  get: (workerId) => apiRequest(`/api/worker/workers/${workerId}`),
  create: (body) =>
    apiRequest('/api/worker/workers', { method: 'POST', body: JSON.stringify(body) }),
  update: (workerId, body) =>
    apiRequest(`/api/worker/workers/${workerId}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (workerId) =>
    apiRequest(`/api/worker/workers/${workerId}`, { method: 'DELETE' }),
  /** Admin: applications + job summary for worker detail */
  jobApplications: (workerId) =>
    apiRequest(`/api/worker/workers/${workerId}/job-applications`),
}

// Employers (admin uses /api/employer/employers with admin token)
export const employersApi = {
  list: (params = {}) => {
    const sp = new URLSearchParams()
    if (params.page) sp.set('page', params.page)
    if (params.limit) sp.set('limit', params.limit)
    if (params.search) sp.set('search', params.search)
    const q = sp.toString()
    return apiRequest(`/api/employer/employers${q ? `?${q}` : ''}`)
  },
  get: (employerId) => apiRequest(`/api/employer/employers/${employerId}`),
  create: (body) =>
    apiRequest('/api/employer/employers', { method: 'POST', body: JSON.stringify(body) }),
  update: (employerId, body) =>
    apiRequest(`/api/employer/employers/${employerId}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (employerId) =>
    apiRequest(`/api/employer/employers/${employerId}`, { method: 'DELETE' }),
}

// Jobs (admin uses /api/job with admin token)
export const jobsApi = {
  list: (params = {}) => {
    const sp = new URLSearchParams()
    if (params.page) sp.set('page', params.page)
    if (params.limit) sp.set('limit', params.limit)
    if (params.status) sp.set('status', params.status)
    if (params.workType) sp.set('workType', params.workType)
    if (params.employerId) sp.set('employerId', params.employerId)
    if (params.search) sp.set('search', params.search)
    if (params.lang) sp.set('lang', params.lang)
    const q = sp.toString()
    return apiRequest(`/api/job${q ? `?${q}` : ''}`)
  },
  /** Jobs for one employer (admin). Prefer over list({ employerId }) for employer detail pages. */
  listByEmployer: (employerId, params = {}) => {
    const sp = new URLSearchParams()
    if (params.page) sp.set('page', params.page)
    if (params.limit) sp.set('limit', params.limit)
    if (params.status) sp.set('status', params.status)
    if (params.workType) sp.set('workType', params.workType)
    if (params.lang) sp.set('lang', params.lang)
    const q = sp.toString()
    return apiRequest(`/api/job/employer/${encodeURIComponent(employerId)}${q ? `?${q}` : ''}`)
  },
  /** @param {string} jobId @param {{ lang?: string, includeAllTranslations?: boolean }} [query] */
  get: (jobId, query = {}) => {
    const sp = new URLSearchParams()
    if (query.lang) sp.set('lang', query.lang)
    if (query.includeAllTranslations) sp.set('includeAllTranslations', 'true')
    const q = sp.toString()
    return apiRequest(`/api/job/${encodeURIComponent(jobId)}${q ? `?${q}` : ''}`)
  },
  translationLocales: () => apiRequest('/api/job/translation-locales'),
  create: (body) =>
    apiRequest('/api/job', { method: 'POST', body: JSON.stringify(body) }),
  /** @param {string} jobId @param {object} body @param {{ lang?: string, includeAllTranslations?: boolean }} [query] */
  update: (jobId, body, query = {}) => {
    const sp = new URLSearchParams()
    if (query.lang) sp.set('lang', query.lang)
    if (query.includeAllTranslations) sp.set('includeAllTranslations', 'true')
    const qs = sp.toString()
    return apiRequest(`/api/job/${encodeURIComponent(jobId)}${qs ? `?${qs}` : ''}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },
  delete: (jobId) =>
    apiRequest(`/api/job/${jobId}`, { method: 'DELETE' }),
  setStatus: (jobId, status) =>
    apiRequest(`/api/job/${jobId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getAudit: (jobId, params = {}) => {
    const sp = new URLSearchParams()
    if (params.page) sp.set('page', params.page)
    if (params.limit) sp.set('limit', params.limit)
    const q = sp.toString()
    return apiRequest(`/api/job/${jobId}/audit${q ? `?${q}` : ''}`)
  },
  assignWorker: (jobId, workerId) =>
    apiRequest(`/api/job/${jobId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ workerId }),
    }),
  unassignWorker: (jobId, workerId, employerId) =>
    apiRequest(
      `/api/job/${jobId}/assign/${workerId}${employerId ? `?employerId=${encodeURIComponent(employerId)}` : ''}`,
      { method: 'DELETE' }
    ),
  // Job flow – employer uses own token; admin passes employerId (query or body)
  getApplicants: (jobId, employerId) =>
    apiRequest(`/api/job/${jobId}/applicants${employerId ? `?employerId=${encodeURIComponent(employerId)}` : ''}`),
  /** Single employer-action API: action = 'hire' | 'reject' | 'complete' | 'cancel' | 'pay-service-charge'. Payload: { workerId? (required for hire/reject), completeImmediately?, employerId?, cancellationReason?, cancellationNote? }. */
  action: (jobId, action, payload = {}) =>
    apiRequest(`/api/job/${jobId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload }),
    }),
  // Legacy per-action helpers (internally can call action; kept for compatibility)
  hire: (jobId, workerId, employerId, completeImmediately) =>
    apiRequest(`/api/job/${jobId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action: 'hire', workerId, ...(employerId && { employerId }), ...(completeImmediately && { completeImmediately }) }),
    }),
  complete: (jobId, employerId) =>
    apiRequest(`/api/job/${jobId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action: 'complete', ...(employerId && { employerId }) }),
    }),
  cancel: (jobId, body) =>
    apiRequest(`/api/job/${jobId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action: 'cancel', ...body }),
    }),
  payServiceCharge: (jobId, employerId) =>
    apiRequest(`/api/job/${jobId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action: 'pay-service-charge', ...(employerId && { employerId }) }),
    }),
  /** Mark penalty paid (admin/employer/worker per backend rules). */
  settlePenalty: (penaltyId) =>
    apiRequest(`/api/job/penalty/${penaltyId}/settle`, { method: 'POST', body: JSON.stringify({}) }),
}

/** Admin job penalty ledger — /api/job/ledger/penalties (not /api/job/penalties: that collides with /:jobId). */
export const penaltiesApi = {
  list: (params = {}) => {
    const sp = new URLSearchParams()
    if (params.page) sp.set('page', params.page)
    if (params.limit) sp.set('limit', params.limit)
    if (params.jobId && isMongoObjectIdString(String(params.jobId))) sp.set('jobId', String(params.jobId).trim())
    if (params.workerId && isMongoObjectIdString(String(params.workerId))) sp.set('workerId', String(params.workerId).trim())
    if (params.status) sp.set('status', params.status)
    const q = sp.toString()
    return apiRequest(`/api/job/ledger/penalties${q ? `?${q}` : ''}`)
  },
  waive: (penaltyId, body = {}) =>
    apiRequest(`/api/job/ledger/penalties/${penaltyId}/waive`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
}

// Skills (for job form dropdown)
export const skillsApi = {
  list: (params = {}) => {
    const sp = new URLSearchParams()
    if (params.page) sp.set('page', params.page)
    if (params.limit) sp.set('limit', params.limit)
    if (params.search) sp.set('search', params.search)
    const q = sp.toString()
    return apiRequest(`/api/skills${q ? `?${q}` : ''}`)
  },
}

// Payment (Razorpay): employer flow + admin ledger
export const paymentApi = {
  createOrderForJob: (jobId) =>
    apiRequest('/api/payment/create-order', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    }),
  verify: (data) =>
    apiRequest('/api/payment/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  /** Single payment row for a job (GET /api/payment/job/:jobId) */
  getJobPayment: (jobId) => apiRequest(`/api/payment/job/${jobId}`),
  getJobPaymentStatus: (jobId) => apiRequest(`/api/payment/job/${jobId}`),
  /** Admin: paginated list (requires PAYMENT_APPROVE or superadmin) */
  listAdminAll: (params = {}) => {
    const sp = new URLSearchParams()
    if (params.page) sp.set('page', params.page)
    if (params.limit) sp.set('limit', params.limit)
    if (params.status) sp.set('status', params.status)
    if (params.payoutStatus) sp.set('payoutStatus', params.payoutStatus)
    if (params.paymentType) sp.set('paymentType', params.paymentType)
    if (params.startDate) sp.set('startDate', params.startDate)
    if (params.endDate) sp.set('endDate', params.endDate)
    if (params.jobId) sp.set('jobId', params.jobId)
    if (params.payerUserId) sp.set('payerUserId', params.payerUserId)
    if (params.workerId) sp.set('workerId', params.workerId)
    if (params.jobEarningsOnly === true || params.jobEarningsOnly === 'true' || params.jobEarningsOnly === '1') {
      sp.set('jobEarningsOnly', 'true')
    }
    if (params.groupByJob === true || params.groupByJob === 'true' || params.groupByJob === '1') {
      sp.set('groupByJob', 'true')
    }
    if (params.search && String(params.search).trim()) sp.set('search', String(params.search).trim())
    if (params.disputeStatus && String(params.disputeStatus).trim()) {
      sp.set('disputeStatus', String(params.disputeStatus).trim())
    }
    const q = sp.toString()
    return apiRequest(`/api/payment/admin/all${q ? `?${q}` : ''}`)
  },
  /** Admin: single payment by Mongo _id (detail view) */
  getAdminPayment: (paymentId) =>
    apiRequest(`/api/payment/admin/payment/${paymentId}`),
  triggerPayouts: () =>
    apiRequest('/api/payment/admin/trigger-payouts', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  /** Same rules as server 30m cron — ONLINE + failed + retries left + no dispute */
  retryFailedPayoutsBatch: () =>
    apiRequest('/api/payment/admin/retry-failed-payouts', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  retryPayout: (paymentId) =>
    apiRequest('/api/payment/admin/retry-payout', {
      method: 'POST',
      body: JSON.stringify({ paymentId }),
    }),
  /** disputeStatus: resolved_worker | resolved_employer | auto_released (batch by job when applicable) */
  resolveDispute: (paymentId, disputeStatus, resolutionNotes) =>
    apiRequest('/api/payment/dispute/resolve', {
      method: 'POST',
      body: JSON.stringify({
        paymentId,
        disputeStatus,
        ...(resolutionNotes ? { resolutionNotes } : {}),
      }),
    }),
  /** Admin: internal notes only; payment must already be resolved (not open/none). */
  updateDisputeNotes: (paymentId, resolutionNotes) =>
    apiRequest('/api/payment/admin/dispute/notes', {
      method: 'PATCH',
      body: JSON.stringify({ paymentId, resolutionNotes: resolutionNotes ?? '' }),
    }),
  /** Admin: paginated dispute queue (open + history) */
  listAdminDisputes: (params = {}) => {
    const sp = new URLSearchParams()
    if (params.page) sp.set('page', params.page)
    if (params.limit) sp.set('limit', params.limit)
    if (params.disputeStatus && params.disputeStatus !== 'all') sp.set('disputeStatus', params.disputeStatus)
    if (params.jobId) sp.set('jobId', params.jobId)
    if (params.startDate) sp.set('startDate', params.startDate)
    if (params.endDate) sp.set('endDate', params.endDate)
    const q = sp.toString()
    return apiRequest(`/api/payment/admin/disputes${q ? `?${q}` : ''}`)
  },
  /** Admin: payment dashboard stats — revenue, payout cron health, disputes, trend */
  getDashboardStats: () => apiRequest('/api/payment/admin/stats'),
}

// Categories (all under /api/categories; with admin token list returns all, without token only active)
export const categoriesApi = {
  list: (params = {}) => {
    const sp = new URLSearchParams()
    if (params.page) sp.set('page', params.page)
    if (params.limit) sp.set('limit', params.limit)
    if (params.search) sp.set('search', params.search)
    if (params.isActive !== undefined && params.isActive !== '') sp.set('isActive', params.isActive)
    const q = sp.toString()
    return apiRequest(`/api/categories${q ? `?${q}` : ''}`)
  },
  get: (categoryId) => apiRequest(`/api/categories/${categoryId}`),
  create: (body) =>
    apiRequest('/api/categories', { method: 'POST', body: JSON.stringify(body) }),
  update: (categoryId, body) =>
    apiRequest(`/api/categories/${categoryId}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (categoryId) =>
    apiRequest(`/api/categories/${categoryId}`, { method: 'DELETE' }),
  toggleActive: (categoryId) =>
    apiRequest(`/api/categories/${categoryId}/toggle-active`, { method: 'PATCH' }),
}
