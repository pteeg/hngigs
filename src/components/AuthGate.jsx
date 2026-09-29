import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { IconArrowRight, IconLock } from '@tabler/icons-react'

export default function AuthGate({ children }) {
  const { user, ready, error, setError, signIn, resetPassword } = useAuth()
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!ready) {
    return (
      <div className="upload-page lock-page">
        <div className="upload-column lock-column">
          <p className="pk-missing">Loading…</p>
        </div>
      </div>
    )
  }

  if (user) return children

  const canSubmit = mode === 'reset' ? email.trim().length > 0 : email.trim().length > 0 && password.length >= 6

  async function onSubmit(event) {
    event.preventDefault()
    if (!canSubmit || submitting) return
    setNotice('')
    setSubmitting(true)
    try {
      if (mode === 'reset') {
        await resetPassword(email)
        setNotice('Check your inbox for a reset link.')
        setMode('sign-in')
      } else {
        await signIn(email, password)
      }
    } catch {
      // The message is already on the auth context.
    } finally {
      setSubmitting(false)
    }
  }

  const title = mode === 'reset' ? 'Reset password' : 'Sign in'

  return (
    <div className="upload-page lock-page">
      <div className="upload-column lock-column">
        <div className="upload-brand">
          <img src="/HN%20logo.png" alt="" className="upload-logo" />
          <div>
            <div className="upload-brand-name">Hot Numbers Gigs</div>
            <div className="upload-sub">Staff</div>
          </div>
        </div>
        <form className="upload-card lock-card" onSubmit={onSubmit}>
          <div className="upload-done-icon" aria-hidden="true">
            <IconLock size={22} stroke={2} />
          </div>
          <h1>{title}</h1>
          <input
            type="email"
            className={'lock-input' + (error ? ' is-wrong' : '')}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setError('')
            }}
            placeholder="Email"
            aria-label="Email"
            autoComplete="username"
            autoFocus
          />
          {mode !== 'reset' && (
            <input
              type="password"
              className={'lock-input' + (error ? ' is-wrong' : '')}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
              }}
              placeholder="Password"
              aria-label="Password"
              autoComplete="current-password"
            />
          )}
          {error && <div className="lock-error">{error}</div>}
          {notice && <div className="lock-notice">{notice}</div>}
          <button type="submit" className="btn btn-primary btn-submit" disabled={!canSubmit || submitting}>
            {mode === 'reset' ? 'Send reset link' : 'Sign in'}
            <IconArrowRight size={16} stroke={2} />
          </button>
          <div className="lock-switch">
            {mode === 'sign-in' && (
              <button type="button" className="lock-alt" onClick={() => { setMode('reset'); setError(''); setNotice('') }}>
                Forgot password?
              </button>
            )}
            {mode !== 'sign-in' && (
              <button type="button" className="lock-alt" onClick={() => { setMode('sign-in'); setError(''); setNotice('') }}>
                Back to sign in
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
