import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const [username, setUsername] = useState('demo')
  const [password, setPassword] = useState('123')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="logo-icon">Z</div>
          <div>
            <h1>ZenvyDesk</h1>
            <p>Sign in to manage drafts, products, content, AI creative, and posting.</p>
          </div>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="form-field">
            <span className="form-label">Username</span>
            <input
              className="form-input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="form-field">
            <span className="form-label">Password</span>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div className="alert alert-error">
              <div className="alert-content">
                <div className="alert-title">Login failed</div>
                <div className="alert-message">{error}</div>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="form-hint">Demo account: demo / 123</div>
        </form>
      </div>
    </div>
  )
}
