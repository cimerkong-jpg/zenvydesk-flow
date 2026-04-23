import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { resetPassword } from '../lib/api'


export function ResetPasswordPage() {
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
            <h1>Reset password</h1>
            <p>Use the generated token to set a new password.</p>
          </div>
        </div>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="form-field">
            <span className="form-label">Reset token</span>
            <input className="form-input" value={token} onChange={(event) => setToken(event.target.value)} />
          </label>
          <label className="form-field">
            <span className="form-label">New password</span>
            <input className="form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary btn-lg">
            Reset password
          </button>
          {message ? <div className="alert alert-success"><div className="alert-content"><div className="alert-title">Password updated</div><div className="alert-message">{message}</div></div></div> : null}
          {error ? <div className="form-error">{error}</div> : null}
          <div className="form-hint">
            <Link to="/login">Back to login</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
