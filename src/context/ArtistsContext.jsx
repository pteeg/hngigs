import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore'
import { useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import {
  assetsFromArtist,
  createArtist,
  fileToMediaItem,
  initialsFromName,
  newUploadToken,
  uniqueArtistId,
} from '../data/artists'
import { auth, db } from '../lib/firebase'
import { ensureStaffProfile } from '../lib/staff'
import {
  deleteArtistRecord,
  fromArtistDoc,
  fromPublicDoc,
  fromTokenDoc,
  overlayToken,
  publicSignature,
  saveArtistRecord,
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
    setReady(false)

    ensureStaffProfile(user)
      .then(() => {
        if (cancelled) return
        unsubArtists = onSnapshot(
          collection(db, 'artists'),
          (snap) => {
            applyRemote(snap.docs.map((item) => fromArtistDoc(item.id, item.data())))
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
          snap.docs.forEach((item) => {
            const tokenArtist = fromTokenDoc(item.id, item.data())
            const current = artistsRef.current.find((artist) => artist.id === tokenArtist.id)
            if (!current || pending.current.has(current.id)) return
            if (publicSignature(current) === publicSignature(tokenArtist)) return
            const next = overlayToken(current, tokenArtist)
            pending.current.set(next.id, next)
            saveArtistRecord(next)
              .catch(() => {})
              .finally(() => pending.current.delete(next.id))
          })
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
    return next
  }, [artists, persist])

  const replaceArtist = useCallback((id, recipe) => {
    const current = artistsRef.current.find((artist) => artist.id === id)
    if (!current) return null
    const next = recipe(current)
    setArtists((list) => list.map((artist) => (artist.id === id ? next : artist)))
    persist(next)
    return next
  }, [persist])

  const addMedia = useCallback((id, files) => {
    const list = Array.from(files ?? [])
    if (!list.length) return
    Promise.all(list.map(fileToMediaItem)).then((items) => {
      if (!items.length) return
      replaceArtist(id, (artist) => {
        const media = [...artist.media, ...items]
        return { ...artist, media, assets: assetsFromArtist({ ...artist, media }) }
      })
    })
  }, [replaceArtist])

  const removeMedia = useCallback((id, index) => {
    replaceArtist(id, (artist) => {
      const media = artist.media.filter((_, itemIndex) => itemIndex !== index)
      return { ...artist, media, assets: assetsFromArtist({ ...artist, media }) }
    })
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
    const added = files.length ? await Promise.all(Array.from(files).map(fileToMediaItem)) : []
    const nextMedia = [...media, ...added]
    const nextContact = {
      email: contact?.email?.trim() || '',
      phone: contact?.phone?.trim() || '',
      instagram: contact?.instagram?.trim() || '',
      spotify: contact?.spotify?.trim() || '',
      youtube: contact?.youtube?.trim() || '',
    }

    if (id) {
      const current = artists.find((artist) => artist.id === id)
      if (!current) return null
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
      return next
    }

    const next = createArtist(trimmed, {
      id: uniqueArtistId(trimmed, artists),
      contact: nextContact,
      bio,
      tagline,
      media: nextMedia,
      actType,
      uploadToken: newUploadToken(),
    })
    setArtists((list) => [...list, next])
    await persist(next)
    return next
  }, [artists, persist])

  const submitAssets = useCallback((id) => {
    replaceArtist(id, (artist) => ({ ...artist, submittedAt: Date.now() }))
  }, [replaceArtist])

  const deleteArtist = useCallback((id) => {
    const current = artists.find((artist) => artist.id === id)
    pending.current.delete(id)
    setArtists((list) => list.filter((artist) => artist.id !== id))
    if (current && user) deleteArtistRecord(current).catch(() => {})
  }, [artists, user])

  const value = useMemo(
    () => ({
      artists,
      ready,
      getArtist,
      getArtistByToken,
      generateLink,
      ensureUploadLink,
      addMedia,
      removeMedia,
      updateBio,
      updateContact,
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
      addMedia,
      removeMedia,
      updateBio,
      updateContact,
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
