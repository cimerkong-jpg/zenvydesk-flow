import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  fetchCurrentUser,
  getStoredAuthToken,
  login as apiLogin,
  logout as apiLogout,
  setStoredAuthToken,
  type AuthUser,
} from '../lib/api'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
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
        setStoredAuthToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (username: string, password: string) => {
        const result = await apiLogin(username, password)
        setStoredAuthToken(result.token)
        setUser(result.user)
      },
      logout: async () => {
        try {
          await apiLogout()
        } finally {
          setStoredAuthToken(null)
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
