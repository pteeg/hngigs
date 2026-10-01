import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

initializeApp()
const db = getFirestore('hngigs')

const ARTIST_ID = /^[a-z0-9-]{1,80}$/
const UPLOAD_TOKEN = /^[A-Za-z0-9]{8,64}$/
const EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const MAX_STAFF_EMAILS = 30
const STAFF_PASSWORD = 'hotnumbers'

// Same fields as toPublicDoc in src/lib/artistRecords.js. The token document has already
// passed isValidToken in firestore.rules, so only the key set is narrowed here.
export function publicKitFrom(token) {
  return {
    name: token.name,
    initials: token.initials,
    tagline: token.tagline,
    bio: token.bio,
    gigs: token.gigs,
    assets: token.assets,
    contact: {
      instagram: token.contact?.instagram ?? '',
      spotify: token.contact?.spotify ?? '',
      youtube: token.contact?.youtube ?? '',
    },
    media: token.media,
    links: token.links,
    gigHistory: token.gigHistory,
    linkGeneratedAt: token.linkGeneratedAt ?? null,
    submittedAt: token.submittedAt ?? null,
  }
}

export const syncPublicKit = onDocumentWritten(
  { document: 'tokens/{token}', database: 'hngigs', region: 'europe-west2' },
  async (event) => {
    const { token } = event.params

    // Events can arrive late, twice, or out of order, so copy the token's current state
    // rather than the event payload.
    const tokenSnap = await db.collection('tokens').doc(token).get()
    if (!tokenSnap.exists) return

    const data = tokenSnap.data()
    const artistId = data.artistId
    if (typeof artistId !== 'string' || !ARTIST_ID.test(artistId)) {
      logger.warn('Token has no valid artistId', { token })
      return
    }

    // Skip tokens that are no longer the artist's live link, and artists staff have deleted,
    // so a stale event cannot recreate or overwrite a kit.
    const artistSnap = await db.collection('artists').doc(artistId).get()
    if (!artistSnap.exists || artistSnap.get('uploadToken') !== token) return

    await db.collection('publicKits').doc(artistId).set(publicKitFrom(data))
  },
)

// Storage rules can only read the (default) Firestore database, so upload access is
// granted as custom claims that storage.rules checks: staff get { staff: true }, and an
// anonymous artist session with a live upload token gets { artistId }.
export const grantUploadAccess = onCall({ region: 'europe-west2' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.')

  const staffSnap = await db.collection('staff').doc(uid).get()
  if (staffSnap.exists && staffSnap.get('role') === 'staff') {
    await getAuth().setCustomUserClaims(uid, { staff: true })
    return { staff: true }
  }

  if (request.auth.token.firebase?.sign_in_provider !== 'anonymous') {
    throw new HttpsError('permission-denied', 'Only staff or an artist link can upload.')
  }
  const token = request.data?.token
  if (typeof token !== 'string' || !UPLOAD_TOKEN.test(token)) {
    throw new HttpsError('invalid-argument', 'Missing upload token.')
  }
  const tokenSnap = await db.collection('tokens').doc(token).get()
  const artistId = tokenSnap.exists ? tokenSnap.get('artistId') : null
  if (typeof artistId !== 'string' || !ARTIST_ID.test(artistId)) {
    throw new HttpsError('not-found', 'This link isn’t valid.')
  }
  const artistSnap = await db.collection('artists').doc(artistId).get()
  if (!artistSnap.exists || artistSnap.get('uploadToken') !== token) {
    throw new HttpsError('not-found', 'This link isn’t valid.')
  }

  await getAuth().setCustomUserClaims(uid, { artistId })
  return { artistId }
})

function normalizeEmail(value) {
  const email = String(value ?? '').trim().toLowerCase()
  if (!EMAIL.test(email) || email.length > 120) {
    throw new HttpsError('invalid-argument', 'Enter a valid email address.')
  }
  return email
}

async function requireStaff(request) {
  const uid = request.auth?.uid
  if (!uid || request.auth.token?.firebase?.sign_in_provider === 'anonymous') {
    throw new HttpsError('unauthenticated', 'Sign in first.')
  }
  const snap = await db.collection('staff').doc(uid).get()
  if (!snap.exists || snap.get('role') !== 'staff') {
    throw new HttpsError('permission-denied', 'Only staff can change the staff list.')
  }
  return { uid, email: String(request.auth.token.email || '').toLowerCase() }
}

function invitedEmailsFrom(snap) {
  const value = snap.exists ? snap.get('invitedEmails') : []
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []
}

// New addresses sign in with STAFF_PASSWORD. Existing accounts keep their password.
async function authUserFor(email) {
  try {
    return { user: await getAuth().getUserByEmail(email), created: false }
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error
  }
  try {
    const user = await getAuth().createUser({
      email,
      password: STAFF_PASSWORD,
    })
    return { user, created: true }
  } catch (error) {
    if (error?.code !== 'auth/email-already-exists') throw error
    return { user: await getAuth().getUserByEmail(email), created: false }
  }
}

export const addStaffEmail = onCall({ region: 'europe-west2' }, async (request) => {
  await requireStaff(request)
  const email = normalizeEmail(request.data?.email)
  const { user, created } = await authUserFor(email)
  const venueRef = db.collection('settings').doc('venue')
  const staffRef = db.collection('staff').doc(user.uid)
  let added = false
  let full = false

  try {
    await db.runTransaction(async (tx) => {
      full = false
      added = false
      const [venue, staff] = await Promise.all([tx.get(venueRef), tx.get(staffRef)])
      const invitedEmails = invitedEmailsFrom(venue)
      const already = invitedEmails.includes(email)
      if (!already && invitedEmails.length >= MAX_STAFF_EMAILS) {
        full = true
        return
      }
      added = !already
      if (added) invitedEmails.push(email)
      tx.set(venueRef, { invitedEmails })
      if (!staff.exists) {
        tx.set(staffRef, { email, role: 'staff', createdAt: FieldValue.serverTimestamp() })
      } else if (staff.get('role') !== 'staff' || staff.get('email') !== email) {
        tx.set(staffRef, {
          email,
          role: 'staff',
          createdAt: staff.get('createdAt') || FieldValue.serverTimestamp(),
        })
      }
    })
  } catch (error) {
    if (created) await getAuth().deleteUser(user.uid).catch(() => {})
    logger.error('addStaffEmail failed', { email, error })
    throw new HttpsError('internal', 'Couldn’t update the staff list. Try again.')
  }

  if (full) {
    if (created) await getAuth().deleteUser(user.uid).catch(() => {})
    throw new HttpsError('failed-precondition', 'The staff list already has 30 addresses.')
  }

  return { email, created, added }
})

export const removeStaffEmail = onCall({ region: 'europe-west2' }, async (request) => {
  const caller = await requireStaff(request)
  const email = normalizeEmail(request.data?.email)
  if (email === caller.email) {
    throw new HttpsError('failed-precondition', 'You can’t remove your own sign-in.')
  }

  let user = null
  try {
    user = await getAuth().getUserByEmail(email)
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error
  }
  if (user?.uid === caller.uid) {
    throw new HttpsError('failed-precondition', 'You can’t remove your own sign-in.')
  }

  const venueRef = db.collection('settings').doc('venue')
  await db.runTransaction(async (tx) => {
    const venue = await tx.get(venueRef)
    tx.set(venueRef, { invitedEmails: invitedEmailsFrom(venue).filter((item) => item !== email) })
    if (user) tx.delete(db.collection('staff').doc(user.uid))
  })

  if (user) {
    try {
      await getAuth().deleteUser(user.uid)
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') throw error
    }
  }

  const extras = await db.collection('staff').where('email', '==', email).get()
  await Promise.all(extras.docs.filter((item) => item.id !== caller.uid).map((item) => item.ref.delete()))

  return { email }
})
