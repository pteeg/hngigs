import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

initializeApp()
const db = getFirestore('hngigs')

const ARTIST_ID = /^[a-z0-9-]{1,80}$/
const UPLOAD_TOKEN = /^[A-Za-z0-9]{8,64}$/

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
