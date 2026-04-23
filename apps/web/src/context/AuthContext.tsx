import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  fetchCurrentUser,
  getStoredAuthToken,
  getStoredRefreshToken,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  setStoredAuthTokens,
  type AuthUser,
} from '../lib/api'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (fullName: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getStoredAuthToken()
    if (!token) {
      setLoading(false)
      return
    }

    fetchCurrentUser()
      .then((currentUser) => setUser(currentUser))
      .catch(() => {
        setStoredAuthTokens(null, null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email: string, password: string) => {
        const result = await apiLogin(email, password)
        setStoredAuthTokens(result.access_token, result.refresh_token)
        setUser(result.user)
      },
      register: async (fullName: string, email: string, password: string) => {
        const result = await apiRegister(email, password, fullName)
        setStoredAuthTokens(result.access_token, result.refresh_token)
        setUser(result.user)
      },
      logout: async () => {
        try {
          if (getStoredRefreshToken()) {
            await apiLogout()
          }
        } finally {
          setStoredAuthTokens(null, null)
          setUser(null)
        }
      },
    }),
    [loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
