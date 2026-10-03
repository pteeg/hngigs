import { doc, writeBatch, setDoc, Timestamp } from 'firebase/firestore'
import { actTypeOf, assetsFromArtist, withHttps } from '../data/artists'
import { db } from './firebase'

const MAX_MEDIA = 6
const MAX_LINKS = 8
const MAX_GIGS = 8
const MAX_URL_BUDGET = 700000
const CONSENT_VERSION_PATTERN = /^v\d{1,15}$/

export const CONSENT_VERSION = 'v1'

function text(value, max) {
  return String(value ?? '').slice(0, max)
}

function millis(value) {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value?.toMillis === 'function') return value.toMillis()
  return null
}

function asTimestamp(value) {
  const ms = millis(value)
  return ms == null ? null : Timestamp.fromMillis(ms)
}

function trimMedia(media) {
  let budget = MAX_URL_BUDGET
  return (media ?? []).slice(0, MAX_MEDIA).map((item) => {
    const raw = typeof item?.url === 'string' ? item.url : ''
    const allowed = raw === '' || raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:image/') || raw.startsWith('data:video/')
    const url = allowed && raw.length <= budget ? raw : ''
    budget -= url.length
    return {
      type: item?.type === 'video' ? 'video' : 'photo',
      label: text(item?.label, 200),
      url,
    }
  })
}

function trimLinks(links) {
  return (links ?? [])
    .map((link) => ({ url: text(withHttps(link?.url), 500), label: text(link?.label, 120) }))
    .filter((link) => link.url.startsWith('http://') || link.url.startsWith('https://'))
    .slice(0, MAX_LINKS)
}

function trimGigs(gigHistory) {
  return (gigHistory ?? [])
    .map((gig) => ({ date: text(gig?.date, 40), name: text(gig?.name, 120) }))
    .filter((gig) => gig.date && gig.name)
    .slice(0, MAX_GIGS)
}

function trimConsent(consent) {
  if (!consent || typeof consent !== 'object') return null
  const agreedAt = millis(consent.agreedAt)
  const version = text(consent.version, 16)
  if (agreedAt == null || !CONSENT_VERSION_PATTERN.test(version)) return null
  return { agreedAt, version }
}

function consentForWrite(consent) {
  if (!consent) return null
  return {
    agreedAt: Timestamp.fromMillis(consent.agreedAt),
    version: consent.version,
  }
}

function publicContact(contact) {
  return {
    instagram: text(contact?.instagram, 200),
    spotify: text(contact?.spotify, 300),
    youtube: text(contact?.youtube, 300),
  }
}

export function prepareArtist(artist) {
  const name = text(artist.name, 120).trim()
  const next = {
    ...artist,
    name,
    initials: text(artist.initials, 4) || '?',
    tagline: text(artist.tagline, 200),
    bio: text(artist.bio, 8000),
    gigs: Number.isInteger(artist.gigs) && artist.gigs >= 0 ? Math.min(artist.gigs, 10000) : 0,
    contact: {
      email: text(artist.contact?.email, 120).trim(),
      phone: text(artist.contact?.phone, 40).trim(),
      ...publicContact(artist.contact),
    },
    media: trimMedia(artist.media),
    links: trimLinks(artist.links),
    gigHistory: trimGigs(artist.gigHistory),
    uploadToken: text(artist.uploadToken, 64),
    linkGeneratedAt: millis(artist.linkGeneratedAt),
    submittedAt: millis(artist.submittedAt),
    consent: trimConsent(artist.consent),
    actType: actTypeOf(artist),
  }
  next.assets = assetsFromArtist(next)
  return next
}

function publicFields(artist) {
  const ready = prepareArtist(artist)
  return {
    name: ready.name,
    initials: ready.initials,
    tagline: ready.tagline,
    bio: ready.bio,
    gigs: ready.gigs,
    assets: ready.assets,
    contact: publicContact(ready.contact),
    media: ready.media,
    links: ready.links,
    gigHistory: ready.gigHistory,
    linkGeneratedAt: asTimestamp(ready.linkGeneratedAt),
    submittedAt: asTimestamp(ready.submittedAt),
  }
}

export function toArtistDoc(artist) {
  const ready = prepareArtist(artist)
  return {
    ...publicFields(ready),
    contact: {
      email: ready.contact.email,
      phone: ready.contact.phone,
      ...publicContact(ready.contact),
    },
    uploadToken: ready.uploadToken,
    linkGeneratedAt: asTimestamp(ready.linkGeneratedAt),
    submittedAt: asTimestamp(ready.submittedAt),
    actType: ready.actType,
    ...consentWrite(ready.consent),
  }
}

export function toPublicDoc(artist) {
  return publicFields(artist)
}

// Tokens also carry email, phone and consent so artists can edit them from their link.
// They never reach publicKits.
export function toTokenDoc(artist) {
  const ready = prepareArtist(artist)
  const contact = publicContact(ready.contact)
  if (artist.contact?.email != null) contact.email = ready.contact.email
  if (artist.contact?.phone != null) contact.phone = ready.contact.phone
  return { artistId: artist.id, ...publicFields(ready), contact, ...consentWrite(ready.consent) }
}

function consentWrite(consent) {
  const stored = consentForWrite(consent)
  return stored ? { consent: stored } : {}
}

function fromTimestamps(data) {
  return {
    ...data,
    linkGeneratedAt: millis(data.linkGeneratedAt),
    submittedAt: millis(data.submittedAt),
  }
}

export function fromArtistDoc(id, data) {
  const artist = fromTimestamps(data)
  artist.id = id
  artist.contact = {
    email: data.contact?.email || '',
    phone: data.contact?.phone || '',
    instagram: data.contact?.instagram || '',
    spotify: data.contact?.spotify || '',
    youtube: data.contact?.youtube || '',
  }
  artist.actType = actTypeOf(artist)
  artist.consent = trimConsent(data.consent)
  return artist
}

export function fromPublicDoc(id, data) {
  const artist = fromArtistDoc(id, {
    ...data,
    contact: { email: '', phone: '', ...publicContact(data.contact) },
    uploadToken: '',
  })
  artist.consent = null
  return artist
}

// Email and phone are null when the token predates them, so overlays keep the staff copy.
export function fromTokenDoc(token, data) {
  const artist = fromPublicDoc(data.artistId, data)
  artist.uploadToken = token
  artist.contact.email = typeof data.contact?.email === 'string' ? data.contact.email : null
  artist.contact.phone = typeof data.contact?.phone === 'string' ? data.contact.phone : null
  artist.consent = trimConsent(data.consent)
  return artist
}

export function publicSignature(artist) {
  const ready = prepareArtist(artist)
  return JSON.stringify({
    tagline: ready.tagline,
    bio: ready.bio,
    media: ready.media,
    links: ready.links,
    assets: ready.assets,
    submittedAt: ready.submittedAt,
    email: ready.contact.email,
    phone: ready.contact.phone,
    instagram: ready.contact.instagram,
    spotify: ready.contact.spotify,
    youtube: ready.contact.youtube,
    consent: ready.consent,
  })
}

export function overlayToken(artist, tokenArtist) {
  return prepareArtist({
    ...artist,
    tagline: tokenArtist.tagline,
    bio: tokenArtist.bio,
    media: tokenArtist.media,
    links: tokenArtist.links,
    assets: tokenArtist.assets,
    submittedAt: tokenArtist.submittedAt,
    contact: {
      ...artist.contact,
      email: tokenArtist.contact?.email ?? artist.contact?.email ?? '',
      phone: tokenArtist.contact?.phone ?? artist.contact?.phone ?? '',
      instagram: tokenArtist.contact?.instagram || '',
      spotify: tokenArtist.contact?.spotify || '',
      youtube: tokenArtist.contact?.youtube || '',
    },
    consent: tokenArtist.consent ?? artist.consent ?? null,
  })
}

export async function saveArtistRecord(artist, previousToken) {
  const ready = prepareArtist(artist)
  const batch = writeBatch(db)
  batch.set(doc(db, 'artists', ready.id), toArtistDoc(ready))
  batch.set(doc(db, 'publicKits', ready.id), toPublicDoc(ready))
  if (ready.uploadToken) batch.set(doc(db, 'tokens', ready.uploadToken), toTokenDoc(ready))
  if (previousToken && previousToken !== ready.uploadToken) batch.delete(doc(db, 'tokens', previousToken))
  await batch.commit()
  return ready
}

// Mirrors token edits into the staff copies without touching the token itself,
// so a late echo can't overwrite newer edits the artist is still making.
export async function saveOverlayRecord(artist) {
  const ready = prepareArtist(artist)
  const batch = writeBatch(db)
  batch.set(doc(db, 'artists', ready.id), toArtistDoc(ready))
  batch.set(doc(db, 'publicKits', ready.id), toPublicDoc(ready))
  await batch.commit()
  return ready
}

export async function saveTokenRecord(artist) {
  const ready = prepareArtist(artist)
  await setDoc(doc(db, 'tokens', ready.uploadToken), toTokenDoc(ready))
  return ready
}

export async function deleteArtistRecord(artist) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'artists', artist.id))
  batch.delete(doc(db, 'publicKits', artist.id))
  if (artist.uploadToken) batch.delete(doc(db, 'tokens', artist.uploadToken))
  await batch.commit()
}
