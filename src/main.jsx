import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { router } from './routes'
import './index.css'

function AuthRedirect() {
  useEffect(() => {
    const handleLogout = () => { window.location.href = '/login' }
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [])
  return null
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AuthRedirect />
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
