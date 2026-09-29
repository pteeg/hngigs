import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

export async function ensureStaffProfile(user) {
  const snap = await getDoc(doc(db, 'staff', user.uid))
  if (!snap.exists() || snap.data()?.role !== 'staff') {
    throw new Error('This account isn’t on the staff list.')
  }
}
