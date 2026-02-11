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
    const err = new Error('Session expired')
    err.status = 401
    throw err
  }
  if (!res.ok) {
    const err = new Error(res.statusText || 'Request failed')
    err.status = res.status
    try {
      err.body = await res.json()
    } catch {
      err.body = await res.text()
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
