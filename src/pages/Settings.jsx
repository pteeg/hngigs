import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import DeveloperTools from '../components/DeveloperTools'
import { IconArrowRight, IconInfoCircle, IconLock, IconPlus, IconX } from '@tabler/icons-react'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// A soft gate to keep the tools out of the way, not access control: the data is protected by staff-only rules.
const DEV_PASSCODE = 'toby'
const DEV_UNLOCK_KEY = 'hn-dev-tools-unlocked'

function readDevUnlocked() {
  try {
    return sessionStorage.getItem(DEV_UNLOCK_KEY) === '1'
  } catch {
    return false
  }
}

function DeveloperToolsSection() {
  const [unlocked, setUnlocked] = useState(readDevUnlocked)
  const [passcode, setPasscode] = useState('')
  const [wrong, setWrong] = useState(false)

  function onUnlock(event) {
    event.preventDefault()
    if (passcode.trim().toLowerCase() !== DEV_PASSCODE) {
      setWrong(true)
      return
    }
    try {
      sessionStorage.setItem(DEV_UNLOCK_KEY, '1')
    } catch {
      // Unlock still works for this page view.
    }
    setUnlocked(true)
  }

  function onLock() {
    try {
      sessionStorage.removeItem(DEV_UNLOCK_KEY)
    } catch {
      // Nothing stored to clear.
    }
    setPasscode('')
    setUnlocked(false)
  }

  return (
    <>
      <section className="settings-section">
        <div className="sec-label">Developer Tools</div>
        <div className="card">
          {unlocked ? (
            <div className="row">
              <div className="row-meta">Pilot stats and staff activity are shown below.</div>
              <button type="button" className="btn btn-outline" onClick={onLock}>
                <IconLock size={16} stroke={1.5} />
                Lock
              </button>
            </div>
          ) : (
            <form className="row" onSubmit={onUnlock}>
              <div className="settings-inline settings-inline-full">
                <input
                  type="password"
                  className={'lock-input' + (wrong ? ' is-wrong' : '')}
                  value={passcode}
                  onChange={(event) => {
                    setPasscode(event.target.value)
                    setWrong(false)
                  }}
                  placeholder="Passcode"
                  aria-label="Developer Tools passcode"
                  autoComplete="off"
                />
                <button type="submit" className="btn btn-outline" disabled={!passcode}>
                  Unlock
                  <IconArrowRight size={16} stroke={1.8} />
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
      {unlocked && <DeveloperTools />}
    </>
  )
}

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

        <DeveloperToolsSection />
      </div>
    </>
  )
}
