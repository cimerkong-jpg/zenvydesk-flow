import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { resetPassword } from '../lib/api'


export function ResetPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [token, setToken] = useState(searchParams.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      const result = await resetPassword(token.trim(), password)
      setMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="logo-icon">Z</div>
          <div>
            <h1>{t('auth.resetPassword.title')}</h1>
            <p>{t('auth.resetPassword.subtitle')}</p>
          </div>
        </div>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="form-field">
            <span className="form-label">{t('auth.resetPassword.token')}</span>
            <input className="form-input" value={token} onChange={(event) => setToken(event.target.value)} />
          </label>
          <label className="form-field">
            <span className="form-label">{t('auth.resetPassword.newPassword')}</span>
            <input className="form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary btn-lg">
            {t('auth.resetPassword.submit')}
          </button>
          {message ? (
            <div className="alert alert-success">
              <div className="alert-content">
                <div className="alert-title">{t('auth.resetPassword.updatedTitle')}</div>
                <div className="alert-message">{message}</div>
              </div>
            </div>
          ) : null}
          {error ? <div className="form-error">{error}</div> : null}
          <div className="form-hint">
            <Link to="/login">{t('auth.resetPassword.backToLogin')}</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
