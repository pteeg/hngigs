import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore'
import { useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import {
  assetsFromArtist,
  createArtist,
  initialsFromName,
  newUploadToken,
  uniqueArtistId,
} from '../data/artists'
import { auth, db } from '../lib/firebase'
import { deleteArtistMedia, deleteMediaFile, uploadMediaFile } from '../lib/media'
import { ensureStaffProfile } from '../lib/staff'
import { logStaff, logStaffSessionOnce } from '../lib/staffLog'
import {
  deleteArtistRecord,
  fromArtistDoc,
  fromPublicDoc,
  fromTokenDoc,
  overlayToken,
  publicSignature,
  CONSENT_VERSION,
  saveArtistRecord,
  saveOverlayRecord,
  saveTokenRecord,
} from '../lib/artistRecords'
import { useAuth } from './AuthContext'

const ArtistsContext = createContext(null)

export function ArtistsProvider({ children }) {
  const { user, ready: authReady, setError } = useAuth()
  const { pathname } = useLocation()
  const publicId = pathname.match(/^\/p\/([^/]+)/)?.[1] || ''
  const uploadToken = pathname.match(/^\/u\/([^/]+)/)?.[1] || ''
  const [artists, setArtists] = useState([])
  const [ready, setReady] = useState(false)
  const pending = useRef(new Map())
  const artistsRef = useRef([])
  const lastWrite = useRef(Promise.resolve())

  useEffect(() => {
    artistsRef.current = artists
  }, [artists])

  const applyRemote = useCallback((list) => {
    setArtists(() => {
      if (pending.current.size === 0) return list
      const remoteIds = new Set(list.map((artist) => artist.id))
      const merged = list.map((artist) => pending.current.get(artist.id) || artist)
      for (const [id, artist] of pending.current) {
        if (!remoteIds.has(id)) merged.push(artist)
      }
      return merged
    })
  }, [])

  useEffect(() => {
    if (!authReady) return undefined
    if (!user) {
      let cancelled = false
      async function loadPublic() {
        try {
          if (uploadToken) {
            const snap = await getDoc(doc(db, 'tokens', uploadToken))
            if (cancelled) return
            setArtists(snap.exists() ? [fromTokenDoc(uploadToken, snap.data())] : [])
          } else if (publicId) {
            const snap = await getDoc(doc(db, 'publicKits', publicId))
            if (cancelled) return
            setArtists(snap.exists() ? [fromPublicDoc(publicId, snap.data())] : [])
          } else if (!cancelled) {
            setArtists([])
          }
        } catch {
          if (!cancelled) setArtists([])
        } finally {
          if (!cancelled) setReady(true)
        }
      }
      setReady(false)
      loadPublic()
      return () => {
        cancelled = true
      }
    }

    let cancelled = false
    let unsubArtists = () => {}
    let unsubTokens = () => {}
    let tokenDocs = []

    // Artist edits land on token documents. Fold them into the staff copy whenever either list
    // changes, so the order the two snapshots arrive in doesn't matter.
    function foldTokens(list) {
      for (const tokenArtist of tokenDocs) {
        const current = list.find((artist) => artist.id === tokenArtist.id)
        if (!current || pending.current.has(current.id)) continue
        const next = overlayToken(current, tokenArtist)
        if (publicSignature(current) === publicSignature(next)) continue
        pending.current.set(next.id, next)
        saveOverlayRecord(next)
          .catch((error) => console.error('Could not fold artist edits into the staff copy', error))
          .finally(() => pending.current.delete(next.id))
      }
    }
    setReady(false)

    ensureStaffProfile(user)
      .then(() => {
        if (cancelled) return
        logStaffSessionOnce(user.uid)
        unsubArtists = onSnapshot(
          collection(db, 'artists'),
          (snap) => {
            const list = snap.docs.map((item) => fromArtistDoc(item.id, item.data()))
            applyRemote(list)
            foldTokens(list)
            setReady(true)
          },
          (error) => {
            if (error?.code === 'permission-denied') {
              setError('This account can’t open the artist list.')
              signOut(auth)
            }
            setReady(true)
          },
        )
        unsubTokens = onSnapshot(collection(db, 'tokens'), (snap) => {
          tokenDocs = snap.docs
            .filter((item) => !item.metadata.hasPendingWrites)
            .map((item) => fromTokenDoc(item.id, item.data()))
          foldTokens(artistsRef.current)
        })
      })
      .catch((error) => {
        if (!cancelled) {
          setError(error.message)
          signOut(auth)
          setReady(true)
        }
      })

    return () => {
      cancelled = true
      unsubArtists()
      unsubTokens()
    }
  }, [applyRemote, authReady, publicId, setError, uploadToken, user])

  const persist = useCallback((artist, previousToken) => {
    pending.current.set(artist.id, artist)
    const write = user ? saveArtistRecord(artist, previousToken) : saveTokenRecord(artist)
    return write.finally(() => {
      if (pending.current.get(artist.id) === artist) pending.current.delete(artist.id)
    })
  }, [user])

  const getArtist = useCallback((id) => artists.find((artist) => artist.id === id), [artists])

  const getArtistByToken = useCallback(
    (token) => artists.find((artist) => artist.uploadToken === token),
    [artists],
  )

  const generateLink = useCallback((name) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    const now = Date.now()
    const existing = artists.find((artist) => artist.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) {
      const next = {
        ...existing,
        uploadToken: existing.uploadToken || newUploadToken(),
        linkGeneratedAt: now,
      }
      next.assets = assetsFromArtist(next)
      setArtists((list) => list.map((artist) => (artist.id === existing.id ? next : artist)))
      persist(next, existing.uploadToken)
      return next
    }
    const next = createArtist(trimmed, {
      id: uniqueArtistId(trimmed, artists),
      uploadToken: newUploadToken(),
      linkGeneratedAt: now,
    })
    setArtists((list) => (list.some((artist) => artist.id === next.id) ? list : [...list, next]))
    persist(next)
    return next
  }, [artists, persist])

  const ensureUploadLink = useCallback((id) => {
    const current = artists.find((artist) => artist.id === id)
    if (!current) return null
    const next = {
      ...current,
      uploadToken: current.uploadToken || newUploadToken(),
      linkGeneratedAt: Date.now(),
    }
    next.assets = assetsFromArtist(next)
    setArtists((list) => list.map((artist) => (artist.id === id ? next : artist)))
    persist(next, current.uploadToken)
    if (user) logStaff('upload_link_requested', { artistId: id, detail: current.name })
    return next
  }, [artists, persist, user])

  const replaceArtist = useCallback((id, recipe) => {
    const current = artistsRef.current.find((artist) => artist.id === id)
    if (!current) return null
    const next = recipe(current)
    artistsRef.current = artistsRef.current.map((artist) => (artist.id === id ? next : artist))
    setArtists((list) => list.map((artist) => (artist.id === id ? next : artist)))
    const write = persist(next)
    write.catch(() => {})
    lastWrite.current = write
    return next
  }, [persist])

  const uploadMedia = useCallback(async (id, file, onProgress) => {
    const artist = artistsRef.current.find((item) => item.id === id)
    if (!artist) return null
    const item = await uploadMediaFile(artist, file, onProgress)
    const next = replaceArtist(id, (current) => {
      const media = [...current.media, item]
      return { ...current, media, assets: assetsFromArtist({ ...current, media }) }
    })
    await lastWrite.current
    return next
  }, [replaceArtist])

  const removeMedia = useCallback((id, index) => {
    const removed = artistsRef.current.find((artist) => artist.id === id)?.media[index]
    const next = replaceArtist(id, (artist) => {
      const media = artist.media.filter((_, itemIndex) => itemIndex !== index)
      return { ...artist, media, assets: assetsFromArtist({ ...artist, media }) }
    })
    if (next && removed) deleteMediaFile(next, removed.url)
  }, [replaceArtist])

  const updateBio = useCallback((id, bio) => {
    replaceArtist(id, (artist) => {
      const next = { ...artist, bio }
      return { ...next, assets: assetsFromArtist(next) }
    })
  }, [replaceArtist])

  const updateContact = useCallback((id, contact) => {
    replaceArtist(id, (artist) => ({ ...artist, contact: { ...artist.contact, ...contact } }))
  }, [replaceArtist])

  const updateGigHistory = useCallback((id, gigHistory) => {
    replaceArtist(id, (artist) => ({ ...artist, gigHistory }))
  }, [replaceArtist])

  const addLink = useCallback((id, link) => {
    if (!link?.url) return
    replaceArtist(id, (artist) => {
      const links = [...(artist.links || []), { url: link.url, label: link.label || '' }]
      const next = { ...artist, links }
      return { ...next, assets: assetsFromArtist(next) }
    })
  }, [replaceArtist])

  const removeLink = useCallback((id, index) => {
    replaceArtist(id, (artist) => {
      const links = (artist.links || []).filter((_, itemIndex) => itemIndex !== index)
      const next = { ...artist, links }
      return { ...next, assets: assetsFromArtist(next) }
    })
  }, [replaceArtist])

  const saveArtist = useCallback(async ({ id, name, tagline, contact, bio, media = [], files = [], actType }) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    const current = id ? artists.find((artist) => artist.id === id) : null
    if (id && !current) return null
    const owner = current ?? { id: uniqueArtistId(trimmed, artists), uploadToken: newUploadToken() }
    const added = await Promise.all(Array.from(files).map((file) => uploadMediaFile(owner, file)))
    const nextMedia = [...media, ...added]
    const nextContact = {
      email: contact?.email?.trim() || '',
      phone: contact?.phone?.trim() || '',
      instagram: contact?.instagram?.trim() || '',
      spotify: contact?.spotify?.trim() || '',
      youtube: contact?.youtube?.trim() || '',
    }

    if (current) {
      const next = {
        ...current,
        name: trimmed,
        initials: initialsFromName(trimmed),
        tagline: tagline?.trim() || '',
        contact: nextContact,
        bio: bio || '',
        media: nextMedia,
        links: current.links || [],
        actType: actType === 'dj' ? 'dj' : 'live',
      }
      next.assets = assetsFromArtist(next)
      setArtists((list) => list.map((artist) => (artist.id === id ? next : artist)))
      await persist(next)
      const kept = new Set(nextMedia.map((item) => item.url))
      current.media.filter((item) => !kept.has(item.url)).forEach((item) => deleteMediaFile(next, item.url))
      if (user) logStaff('artist_edited', { artistId: id, detail: trimmed })
      return next
    }

    const next = createArtist(trimmed, {
      id: owner.id,
      contact: nextContact,
      bio,
      tagline,
      media: nextMedia,
      actType,
      uploadToken: owner.uploadToken,
    })
    setArtists((list) => [...list, next])
    await persist(next)
    if (user) logStaff('artist_created', { artistId: next.id, detail: trimmed })
    return next
  }, [artists, persist, user])

  // Resolves true once the save has reached the database, false if it was rejected.
  const submitAssets = useCallback(async (id) => {
    const agreedAt = Date.now()
    const next = replaceArtist(id, (artist) => ({
      ...artist,
      submittedAt: agreedAt,
      consent: { agreedAt, version: CONSENT_VERSION },
    }))
    if (!next) return false
    try {
      await lastWrite.current
      return true
    } catch {
      return false
    }
  }, [replaceArtist])

  const deleteArtist = useCallback((id) => {
    const current = artists.find((artist) => artist.id === id)
    pending.current.delete(id)
    setArtists((list) => list.filter((artist) => artist.id !== id))
    if (current && user) {
      deleteArtistRecord(current).catch(() => {})
      deleteArtistMedia(id)
      logStaff('artist_deleted', { artistId: id, detail: current.name })
    }
  }, [artists, user])

  const value = useMemo(
    () => ({
      artists,
      ready,
      getArtist,
      getArtistByToken,
      generateLink,
      ensureUploadLink,
      uploadMedia,
      removeMedia,
      updateBio,
      updateContact,
      updateGigHistory,
      addLink,
      removeLink,
      saveArtist,
      deleteArtist,
      submitAssets,
    }),
    [
      artists,
      ready,
      getArtist,
      getArtistByToken,
      generateLink,
      ensureUploadLink,
      uploadMedia,
      removeMedia,
      updateBio,
      updateContact,
      updateGigHistory,
      addLink,
      removeLink,
      saveArtist,
      deleteArtist,
      submitAssets,
    ],
  )

  return <ArtistsContext.Provider value={value}>{children}</ArtistsContext.Provider>
}

export function useArtists() {
  const ctx = useContext(ArtistsContext)
  if (!ctx) throw new Error('useArtists must be used within ArtistsProvider')
  return ctx
}
