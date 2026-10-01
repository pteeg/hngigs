import { httpsCallable } from 'firebase/functions'
import { doc, getDoc } from 'firebase/firestore'
import { db, functions } from './firebase'

export async function ensureStaffProfile(user) {
  const snap = await getDoc(doc(db, 'staff', user.uid))
  if (!snap.exists() || snap.data()?.role !== 'staff') {
    throw new Error('This account isn’t on the staff list.')
  }
}

function messageFor(error) {
  const code = error?.code || ''
  if (code.startsWith('functions/') && error.message && error.message !== 'INTERNAL') return error.message
  return 'Couldn’t update the staff list. Try again.'
}

export async function addStaffEmail(email) {
  const next = email.trim().toLowerCase()
  let data
  try {
    ;({ data } = await httpsCallable(functions, 'addStaffEmail')({ email: next }))
  } catch (error) {
    throw new Error(messageFor(error))
  }
  return { email: next, created: !!data?.created, added: !!data?.added }
}

export async function removeStaffEmail(email) {
  const next = email.trim().toLowerCase()
  try {
    await httpsCallable(functions, 'removeStaffEmail')({ email: next })
  } catch (error) {
    throw new Error(messageFor(error))
  }
}
