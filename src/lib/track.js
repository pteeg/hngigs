import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

const SESSION_KEY = 'hn-session-id'
let memorySessionId = ''

function newSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function sessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = newSessionId()
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    if (!memorySessionId) memorySessionId = newSessionId()
    return memorySessionId
  }
}

export function track(type, artistId, meta = {}) {
  try {
    addDoc(collection(db, 'events'), {
      type,
      artistId,
      sessionId: sessionId(),
      meta,
      ts: serverTimestamp(),
    }).catch(() => {})
  } catch {
    // Logging must never break the page.
  }
}

export function trackOncePerSession(type, artistId, meta = {}) {
  const key = `hn-tracked-${type}-${artistId}`
  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    // Without sessionStorage the event may repeat, which is acceptable.
  }
  track(type, artistId, meta)
}

export function referrerHost() {
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : ''
    return host.slice(0, 200) || 'direct'
  } catch {
    return 'direct'
  }
}
