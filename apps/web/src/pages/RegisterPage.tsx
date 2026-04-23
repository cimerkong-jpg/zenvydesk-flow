import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'


export function RegisterPage() {
  const { user, loading, register } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await register(fullName.trim(), email.trim(), password)
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
            <h1>Create account</h1>
            <p>Use internal app auth for ZenvyDesk access. Facebook is connected later.</p>
          </div>
        </div>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="form-field">
            <span className="form-label">Full name</span>
            <input className="form-input" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>
          <label className="form-field">
            <span className="form-label">Email</span>
            <input className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="form-field">
            <span className="form-label">Password</span>
            <input className="form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label className="form-field">
            <span className="form-label">Confirm password</span>
            <input className="form-input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </label>
          {error ? (
            <div className="alert alert-error">
              <div className="alert-content">
                <div className="alert-title">Registration failed</div>
                <div className="alert-message">{error}</div>
              </div>
            </div>
          ) : null}
          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
          <div className="form-hint">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
