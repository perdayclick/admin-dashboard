import { createContext, useContext, useState, useCallback } from 'react'

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'admin_access_token',
  REFRESH_TOKEN: 'admin_refresh_token',
  USER: 'admin_user',
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN))
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN))

  const setAuth = useCallback((data) => {
    if (data?.accessToken) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken)
      setAccessToken(data.accessToken)
    }
    if (data?.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken)
      setRefreshToken(data.refreshToken)
    }
    if (data?.user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user))
      setUser(data.user)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)
    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)
  }, [])

  const getToken = useCallback(() => accessToken, [accessToken])

  const isAuthenticated = !!accessToken

  const value = {
    user,
    accessToken,
    refreshToken,
    setAuth,
    logout,
    getToken,
    isAuthenticated,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
