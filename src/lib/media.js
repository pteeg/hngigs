import { signInAnonymously } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { deleteObject, getDownloadURL, listAll, ref, uploadBytesResumable } from 'firebase/storage'
import { auth, functions, storage } from './firebase'

export const MAX_MEDIA = 6
const MB = 1024 * 1024
const MAX_PHOTO_BYTES = 25 * MB
const MAX_VIDEO_BYTES = 500 * MB

export function mediaTypeOf(file) {
  if (file?.type?.startsWith('image/')) return 'photo'
  if (file?.type?.startsWith('video/')) return 'video'
  return null
}

export function mediaProblem(file) {
  const type = mediaTypeOf(file)
  if (!type) return `${file.name} isn’t a photo or video.`
  if (type === 'photo' && file.size > MAX_PHOTO_BYTES) return `${file.name} is over 25 MB. Try a smaller photo.`
  if (type === 'video' && file.size > MAX_VIDEO_BYTES) return `${file.name} is over 500 MB. Add it as a link instead.`
  return null
}

// Storage rules can't read the named Firestore database, so a Cloud Function checks the
// upload token (or staff record) and grants a custom claim that the rules can see.
async function ensureUploadAccess(artistId, uploadToken) {
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

export async function uploadMediaFile(artist, file, onProgress) {
  const type = mediaTypeOf(file)
  await ensureUploadAccess(artist.id, artist.uploadToken)
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const task = uploadBytesResumable(ref(storage, `media/${artist.id}/${id}.${extensionOf(file)}`), file, {
    contentType: file.type,
  })
  await new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => onProgress?.(snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0),
      reject,
      resolve,
    )
  })
  return { type, label: file.name, url: await getDownloadURL(task.snapshot.ref) }
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
