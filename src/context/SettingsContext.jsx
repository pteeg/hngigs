import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { addStaffEmail as addStaffEmailRequest, removeStaffEmail as removeStaffEmailRequest } from '../lib/staff'
import { logStaff } from '../lib/staffLog'
import { useAuth } from './AuthContext'

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
  const { user } = useAuth()
  const [notifyEmails, setNotifyEmails] = useState(readNotifyEmails)
  const [staffEmails, setStaffEmails] = useState([])

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ notifyEmails }))
  }, [notifyEmails])

  useEffect(() => {
    if (!user) {
      setStaffEmails([])
      return undefined
    }
    return onSnapshot(
      doc(db, 'settings', 'venue'),
      (snap) => {
        const emails = snap.exists() ? snap.data()?.invitedEmails : []
        setStaffEmails(Array.isArray(emails) ? emails.filter((item) => typeof item === 'string') : [])
      },
      () => setStaffEmails([]),
    )
  }, [user])

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

  const addStaffEmail = useCallback(async (email) => {
    const result = await addStaffEmailRequest(email)
    logStaff('staff_email_added', { detail: result.email })
    return result
  }, [])

  const removeStaffEmail = useCallback(async (email) => {
    await removeStaffEmailRequest(email)
    logStaff('staff_email_removed', { detail: email.trim().toLowerCase() })
  }, [])

  const value = useMemo(
    () => ({
      notifyEmails,
      addNotifyEmail,
      removeNotifyEmail,
      staffEmails,
      addStaffEmail,
      removeStaffEmail,
    }),
    [notifyEmails, addNotifyEmail, removeNotifyEmail, staffEmails, addStaffEmail, removeStaffEmail],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
