import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

// Must match isValidEmail in firestore.rules, or the write is rejected.
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export const WAITLIST_ANSWERS = ['yes', 'not_now', 'no']

export function isValidWaitlistEmail(email) {
  return email.length >= 3 && email.length <= 120 && EMAIL_PATTERN.test(email)
}

export function saveWaitlistAnswer(artistId, answer, reason, email) {
  if (!WAITLIST_ANSWERS.includes(answer)) return
  const cleanEmail = String(email ?? '').trim()
  const entry = {
    artistId,
    answer,
    reason: String(reason ?? '').trim().slice(0, 300),
    createdAt: serverTimestamp(),
  }
  if (cleanEmail && isValidWaitlistEmail(cleanEmail)) entry.email = cleanEmail
  try {
    addDoc(collection(db, 'waitlist'), entry).catch(() => {})
  } catch {
    // The answer is best effort; the artist has already been thanked.
  }
}
