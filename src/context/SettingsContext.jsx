import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { logStaff } from '../lib/staffLog'

const SettingsContext = createContext(null)
const SETTINGS_KEY = 'hn-gigs-settings-v1'

const DEFAULT_EMAILS = ['steve@hotnumbers.co.uk']

function readNotifyEmails() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null')
    if (Array.isArray(parsed?.notifyEmails) && parsed.notifyEmails.length) return parsed.notifyEmails
  } catch {
    // Fall back to the venue default if this browser has no saved addresses.
  }
  return DEFAULT_EMAILS
}

export function SettingsProvider({ children }) {
  const [notifyEmails, setNotifyEmails] = useState(readNotifyEmails)

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ notifyEmails }))
  }, [notifyEmails])

  const addNotifyEmail = useCallback((email) => {
    const next = email.trim().toLowerCase()
    if (!next) return
    setNotifyEmails((current) => (current.includes(next) ? current : [...current, next]))
    logStaff('notify_email_added', { detail: next })
  }, [])

  const removeNotifyEmail = useCallback((email) => {
    setNotifyEmails((current) => current.filter((item) => item !== email))
    logStaff('notify_email_removed', { detail: email })
  }, [])

  const value = useMemo(
    () => ({
      notifyEmails,
      addNotifyEmail,
      removeNotifyEmail,
    }),
    [notifyEmails, addNotifyEmail, removeNotifyEmail],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
