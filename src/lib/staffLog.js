import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

const SESSION_KEY = 'hn-staff-session'

// Resolves when the write settles or after the timeout, and never rejects.
export function logStaff(action, { artistId = '', detail = '' } = {}, timeoutMs = 1500) {
  const user = auth.currentUser
  if (!user?.email) return Promise.resolve()
  try {
    const write = addDoc(collection(db, 'staffActivity'), {
      uid: user.uid,
      email: user.email,
      action,
      artistId,
      detail: String(detail ?? '').slice(0, 200),
      ts: serverTimestamp(),
    }).catch(() => {})
    return Promise.race([write, new Promise((resolve) => window.setTimeout(resolve, timeoutMs))])
  } catch {
    return Promise.resolve()
  }
}

export function markStaffSession(uid) {
  try {
    sessionStorage.setItem(SESSION_KEY, uid)
  } catch {
    // Without sessionStorage a session_started entry may repeat, which is acceptable.
  }
}

export function logStaffSessionOnce(uid) {
  try {
    if (sessionStorage.getItem(SESSION_KEY) === uid) return
  } catch {
    // Fall through and log.
  }
  markStaffSession(uid)
  logStaff('session_started')
}
