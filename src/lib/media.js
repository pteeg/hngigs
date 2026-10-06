import { signInAnonymously } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { deleteObject, getDownloadURL, listAll, ref, uploadBytesResumable } from 'firebase/storage'
import { auth, functions, storage } from './firebase'

export const MAX_MEDIA = 8
export const MAX_PHOTO_MB = 25
export const MAX_AUDIO_MB = 50
export const MAX_VIDEO_MB = 500
const MB = 1024 * 1024
const MAX_PHOTO_BYTES = MAX_PHOTO_MB * MB
const MAX_VIDEO_BYTES = MAX_VIDEO_MB * MB
const MAX_AUDIO_BYTES = MAX_AUDIO_MB * MB

function statedMegabytes(bytes, limitMb) {
  const mb = bytes / MB
  const whole = Math.round(mb)
  if (whole > limitMb) return String(whole)
  const tenths = Math.ceil(mb * 10) / 10
  return Number.isInteger(tenths) ? String(tenths) : tenths.toFixed(1)
}

export function mediaTypeOf(file) {
  if (file?.type?.startsWith('image/')) return 'photo'
  if (file?.type?.startsWith('video/')) return 'video'
  if (file?.type?.startsWith('audio/')) return 'audio'
  return null
}

export function mediaProblem(file) {
  const type = mediaTypeOf(file)
  if (!type) return `${file.name} isn’t a photo, video or audio file.`
  if (type === 'photo' && file.size > MAX_PHOTO_BYTES) {
    return `${file.name} is ${statedMegabytes(file.size, MAX_PHOTO_MB)} MB. Photos can be up to ${MAX_PHOTO_MB} MB.`
  }
  if (type === 'video' && file.size > MAX_VIDEO_BYTES) {
    return `${file.name} is ${statedMegabytes(file.size, MAX_VIDEO_MB)} MB. Video can be up to ${MAX_VIDEO_MB} MB.`
  }
  if (type === 'audio' && file.size > MAX_AUDIO_BYTES) {
    return `${file.name} is ${statedMegabytes(file.size, MAX_AUDIO_MB)} MB. Audio can be up to ${MAX_AUDIO_MB} MB.`
  }
  return null
}

// Storage rules can't read the named Firestore database, so a Cloud Function checks the
// upload token (or staff record) and grants a custom claim that the rules can see.
// One grant is shared per artist so simultaneous uploads don't refresh the ID token
// out from under each other.
const uploadAccessInflight = new Map()

function ensureUploadAccess(artistId, uploadToken) {
  const existing = uploadAccessInflight.get(artistId)
  if (existing) return existing
  const pending = requestUploadAccess(artistId, uploadToken)
  const shared = pending.finally(() => {
    if (uploadAccessInflight.get(artistId) === shared) uploadAccessInflight.delete(artistId)
  })
  uploadAccessInflight.set(artistId, shared)
  return shared
}

async function requestUploadAccess(artistId, uploadToken) {
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user
  const { claims } = await user.getIdTokenResult()
  if (claims.staff === true || claims.artistId === artistId) return
  await httpsCallable(functions, 'grantUploadAccess')({ token: uploadToken })
  await user.getIdToken(true)
}

function extensionOf(file) {
  const fromName = file.name.includes('.') ? file.name.split('.').pop() : ''
  const ext = fromName || file.type.split('/')[1] || ''
  return ext.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
}

function sendMediaFile(artistId, file, onProgress) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const task = uploadBytesResumable(ref(storage, `media/${artistId}/${id}.${extensionOf(file)}`), file, {
    contentType: file.type,
  })
  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => onProgress?.(snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0),
      reject,
      () => resolve(task.snapshot.ref),
    )
  })
}

export async function uploadMediaFile(artist, file, onProgress) {
  const type = mediaTypeOf(file)
  await ensureUploadAccess(artist.id, artist.uploadToken)
  let fileRef
  try {
    fileRef = await sendMediaFile(artist.id, file, onProgress)
  } catch (error) {
    if (error?.code !== 'storage/unauthorized') throw error
    const user = auth.currentUser
    if (user) await user.getIdToken(true)
    await ensureUploadAccess(artist.id, artist.uploadToken)
    fileRef = await sendMediaFile(artist.id, file, onProgress)
  }
  return { type, label: file.name, url: await getDownloadURL(fileRef) }
}

function isStorageUrl(url) {
  return typeof url === 'string' && url.startsWith('https://firebasestorage.googleapis.com/')
}

export function deleteMediaFile(artist, url) {
  if (!isStorageUrl(url)) return
  ensureUploadAccess(artist.id, artist.uploadToken)
    .then(() => deleteObject(ref(storage, url)))
    .catch(() => {})
}

export async function deleteArtistMedia(artistId) {
  try {
    const { items } = await listAll(ref(storage, `media/${artistId}`))
    await Promise.all(items.map((item) => deleteObject(item).catch(() => {})))
  } catch {
    // Leftover files are harmless; they are no longer referenced by any record.
  }
}
