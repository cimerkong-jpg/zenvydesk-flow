import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../context/AuthContext'
import { formatDisplayError } from '../lib/errors'


export function RegisterPage() {
  const { t } = useTranslation()
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
      setError(t('auth.register.passwordMismatch'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await register(fullName.trim(), email.trim(), password)
    } catch (err) {
      setError(formatDisplayError(err))
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
            <h1>{t('auth.register.title')}</h1>
            <p>{t('auth.register.subtitle')}</p>
          </div>
        </div>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="form-field">
            <span className="form-label">{t('auth.register.fullName')}</span>
            <input className="form-input" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>
          <label className="form-field">
            <span className="form-label">{t('auth.register.email')}</span>
            <input className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="form-field">
            <span className="form-label">{t('auth.register.password')}</span>
            <input className="form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label className="form-field">
            <span className="form-label">{t('auth.register.confirmPassword')}</span>
            <input className="form-input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </label>
          {error ? (
            <div className="alert alert-error">
              <div className="alert-content">
                <div className="alert-title">{t('auth.register.failedTitle')}</div>
                <div className="alert-message">{error}</div>
              </div>
            </div>
          ) : null}
          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting ? t('auth.register.submitting') : t('auth.register.submit')}
          </button>
          <div className="form-hint">
            {t('auth.register.alreadyHaveAccount')} <Link to="/login">{t('auth.register.signIn')}</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
