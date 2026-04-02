import { Navigate, useLocation, useSearchParams } from 'react-router-dom'

const VALID = new Set(['overview', 'transactions', 'payouts', 'disputes'])

function searchWithoutTab(search) {
  const p = new URLSearchParams(search)
  p.delete('tab')
  const q = p.toString()
  return q ? `?${q}` : ''
}

export default function PaymentsIndexRedirect() {
  const [sp] = useSearchParams()
  const { search } = useLocation()
  const suffix = searchWithoutTab(search)
  const t = sp.get('tab')
  if (t && VALID.has(t)) {
    const seg = t === 'overview' ? 'overview' : t
    return <Navigate to={`/payments/${seg}${suffix}`} replace />
  }
  return <Navigate to={`/payments/overview${suffix}`} replace />
}
