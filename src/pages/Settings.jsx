import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { IconInfoCircle, IconLock, IconPlus, IconX } from '@tabler/icons-react'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Settings() {
  const { user, logOut } = useAuth()
  const { notifyEmails, addNotifyEmail, removeNotifyEmail } = useSettings()
  const [newEmail, setNewEmail] = useState('')
  const [notifyInfoOpen, setNotifyInfoOpen] = useState(false)
  const notifyInfoRef = useRef(null)
  const notifyInfoId = useId()
  const emailValid = EMAIL_PATTERN.test(newEmail.trim())

  useEffect(() => {
    if (!notifyInfoOpen) return undefined
    function onPointerDown(event) {
      if (!notifyInfoRef.current?.contains(event.target)) setNotifyInfoOpen(false)
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setNotifyInfoOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [notifyInfoOpen])

  function onAddEmail(event) {
    event.preventDefault()
    if (!emailValid) return
    addNotifyEmail(newEmail)
    setNewEmail('')
  }

  return (
    <>
      <header className="page-header">
        <div className="page-heading">
          <h1 className="page-title">Settings</h1>
        </div>
      </header>

      <div className="page-content">
        <section className="settings-section">
          <div className="sec-label">Account</div>
          <div className="card">
            <div className="row">
              <div>
                <div className="row-name">{user?.email}</div>
                <div className="row-meta">Signed in with email and password.</div>
              </div>
              <button type="button" className="btn btn-outline" onClick={logOut}>
                <IconLock size={16} stroke={1.5} />
                Sign out
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="sec-heading-wrap" ref={notifyInfoRef}>
            <div className="sec-heading">
              <div className="sec-label">Notifications</div>
              <span className="coming-soon">Coming soon</span>
              <button
                type="button"
                className="info-btn"
                aria-expanded={notifyInfoOpen}
                aria-controls={notifyInfoId}
                aria-label="About artist update emails"
                onClick={() => setNotifyInfoOpen((open) => !open)}
              >
                <IconInfoCircle size={16} stroke={1.8} />
              </button>
            </div>
            {notifyInfoOpen && (
              <div className="info-pop" id={notifyInfoId} role="note">
                <div className="row-name">Artist update emails</div>
                <div className="row-meta">Coming soon. These addresses will get an email when an artist saves their assets through their link.</div>
              </div>
            )}
          </div>
          <div className="card">
            {notifyEmails.map((email) => (
              <div className="row" key={email}>
                <div className="row-name settings-email">{email}</div>
                <button type="button" className="upload-remove" onClick={() => removeNotifyEmail(email)} aria-label={`Remove ${email}`}>
                  <IconX size={15} stroke={1.6} />
                </button>
              </div>
            ))}
            <form className="row" onSubmit={onAddEmail}>
              <div className="settings-inline settings-inline-full">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  placeholder="name@hotnumbers.co.uk"
                  aria-label="Add an email address"
                />
                <button type="submit" className="btn btn-outline" disabled={!emailValid}>
                  <IconPlus size={16} stroke={1.8} />
                  Add
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </>
  )
}
