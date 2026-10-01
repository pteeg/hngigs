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
  const { staffEmails, addStaffEmail, removeStaffEmail } = useSettings()
  const [staffEmail, setStaffEmail] = useState('')
  const [staffNotice, setStaffNotice] = useState('')
  const [staffError, setStaffError] = useState('')
  const [staffBusy, setStaffBusy] = useState(false)
  const [notifyInfoOpen, setNotifyInfoOpen] = useState(false)
  const notifyInfoRef = useRef(null)
  const notifyInfoId = useId()
  const staffEmailValid = EMAIL_PATTERN.test(staffEmail.trim())
  const ownEmail = user?.email?.trim().toLowerCase() || ''
  const staffRows = [...new Set([ownEmail, ...staffEmails.map((email) => email.toLowerCase())].filter(Boolean))]

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

  async function onAddStaff(event) {
    event.preventDefault()
    if (!staffEmailValid || staffBusy) return
    setStaffError('')
    setStaffNotice('')
    setStaffBusy(true)
    try {
      const result = await addStaffEmail(staffEmail)
      setStaffEmail('')
      if (result.created) setStaffNotice(`${result.email} can sign in with the password hotnumbers.`)
      else if (result.added) setStaffNotice(`${result.email} can sign in with their existing password.`)
      else setStaffNotice(`${result.email} is already on the staff list.`)
    } catch (error) {
      setStaffError(error.message)
    } finally {
      setStaffBusy(false)
    }
  }

  async function onRemoveStaff(email) {
    if (staffBusy) return
    if (!window.confirm(`Remove ${email} from the staff list? They won’t be able to sign in.`)) return
    setStaffError('')
    setStaffNotice('')
    setStaffBusy(true)
    try {
      await removeStaffEmail(email)
      setStaffNotice(`Removed ${email}.`)
    } catch (error) {
      setStaffError(error.message)
    } finally {
      setStaffBusy(false)
    }
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
          <div className="sec-label">Staff</div>
          <div className="card">
            <div className="row">
              <div className="row-meta">People on this list can sign in. New addresses use the password hotnumbers.</div>
            </div>
            {staffRows.map((email) => (
              <div className="row" key={email}>
                <div>
                  <div className="row-name settings-email">{email}</div>
                  {email === ownEmail && <div className="row-meta">You</div>}
                </div>
                {email !== ownEmail && (
                  <button
                    type="button"
                    className="upload-remove"
                    onClick={() => onRemoveStaff(email)}
                    disabled={staffBusy}
                    aria-label={`Remove ${email}`}
                  >
                    <IconX size={15} stroke={1.6} />
                  </button>
                )}
              </div>
            ))}
            {(staffError || staffNotice) && (
              <div className="row">
                <div className={staffError ? 'settings-error' : 'settings-notice'}>{staffError || staffNotice}</div>
              </div>
            )}
            <form className="row" onSubmit={onAddStaff}>
              <div className="settings-inline settings-inline-full">
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(event) => {
                    setStaffEmail(event.target.value)
                    setStaffError('')
                  }}
                  placeholder="name@hotnumberscoffee.co.uk"
                  aria-label="Add a staff email"
                  disabled={staffBusy}
                />
                <button type="submit" className="btn btn-outline" disabled={!staffEmailValid || staffBusy}>
                  <IconPlus size={16} stroke={1.8} />
                  Add
                </button>
              </div>
            </form>
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
                <div className="row-meta">Coming soon. Choose email addresses to get an email when an artist saves their assets through their link.</div>
              </div>
            )}
          </div>
        </section>

        <DeveloperToolsSection />
      </div>
    </>
  )
}
