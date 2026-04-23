import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { forgotPassword } from '../lib/api'


export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      const result = await forgotPassword(email.trim())
      setMessage(result.message)
      setToken(result.reset_token ?? null)
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
            <h1>{t('auth.forgotPassword.title')}</h1>
            <p>{t('auth.forgotPassword.subtitle')}</p>
          </div>
        </div>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="form-field">
            <span className="form-label">{t('auth.forgotPassword.email')}</span>
            <input className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary btn-lg">
            {t('auth.forgotPassword.submit')}
          </button>
          {message ? (
            <div className="alert alert-success">
              <div className="alert-content">
                <div className="alert-title">{t('auth.forgotPassword.acceptedTitle')}</div>
                <div className="alert-message">{message}</div>
              </div>
            </div>
          ) : null}
          {token ? <div className="form-hint">{t('auth.forgotPassword.devToken', { token })}</div> : null}
          {error ? <div className="form-error">{error}</div> : null}
          <div className="form-hint">
            <Link to="/login">{t('auth.forgotPassword.backToLogin')}</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
