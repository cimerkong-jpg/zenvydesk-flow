import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../context/AuthContext'


export function LoginPage() {
  const { t } = useTranslation()
  const { user, loading, login } = useAuth()
  const [email, setEmail] = useState('admin@zenvydesk.com')
  const [password, setPassword] = useState('Admin123!')
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
      await login(email.trim(), password)
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
            <p>{t('auth.login.subtitle')}</p>
          </div>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="form-field">
            <span className="form-label">{t('auth.login.email')}</span>
            <input
              className="form-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="form-field">
            <span className="form-label">{t('auth.login.password')}</span>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error ? (
            <div className="alert alert-error">
              <div className="alert-content">
                <div className="alert-title">{t('auth.login.failedTitle')}</div>
                <div className="alert-message">{error}</div>
              </div>
            </div>
          ) : null}

          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting ? t('auth.login.submitting') : t('auth.login.submit')}
          </button>

          <div className="form-hint">
            {t('auth.login.seededAdmin', { email: 'admin@zenvydesk.com', password: 'Admin123!' })}
          </div>
          <div className="form-hint">
            <Link to="/register">{t('auth.login.createAccount')}</Link> · <Link to="/forgot-password">{t('auth.login.forgotPassword')}</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
