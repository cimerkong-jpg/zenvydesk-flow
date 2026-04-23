import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { forgotPassword } from '../lib/api'


export function ForgotPasswordPage() {
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
            <h1>Forgot password</h1>
            <p>Enter your email and ZenvyDesk will generate a reset token.</p>
          </div>
        </div>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="form-field">
            <span className="form-label">Email</span>
            <input className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary btn-lg">
            Generate reset token
          </button>
          {message ? <div className="alert alert-success"><div className="alert-content"><div className="alert-title">Request accepted</div><div className="alert-message">{message}</div></div></div> : null}
          {token ? <div className="form-hint">Development reset token: {token}</div> : null}
          {error ? <div className="form-error">{error}</div> : null}
          <div className="form-hint">
            <Link to="/login">Back to login</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
