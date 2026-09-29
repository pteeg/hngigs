// Seed records copied into Firestore the first time a staff member signs in.

export const artists = [
  {
    id: 'laura-birch',
    initials: 'LB',
    name: 'Laura Birch',
    tagline: 'Folk singer-songwriter · Cambridge',
    gigs: 3,
    assets: 'received',
    bio: 'Laura Birch is a Cambridge-based folk singer-songwriter whose writing sits between intimate fingerpicked guitar and full-band live sets. She has played Discovery Sessions and Sunday Sessions at Hot Numbers.',
    contact: {
      email: 'laura@laurabirch.co.uk',
      phone: '+44 7700 900142',
      instagram: '@laurabirchmusic',
      spotify: 'Laura Birch',
      youtube: 'Laura Birch Music',
    },
    media: [
      { type: 'photo', label: 'Press photo · uploaded 14 Oct' },
      { type: 'photo', label: 'Live at Hot Numbers · Oct 2024' },
    ],
    links: [
      { url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', label: 'Live session' },
    ],
    gigHistory: [
      { date: '12 Oct 2024', name: 'Discovery Sessions' },
      { date: '3 Mar 2024', name: 'Sunday Sessions' },
      { date: '8 Nov 2023', name: 'Discovery Sessions' },
    ],
    uploadToken: 'l4lb9r2c0h7n',
  },
  {
    id: 'joe-magee',
    initials: 'JM',
    name: 'Joe Magee',
    tagline: 'Guitarist & composer · Cambridge',
    gigs: 1,
    assets: 'partial',
    bio: 'Joe Magee is a Cambridge guitarist and composer working between jazz, folk, and quietly experimental song forms. He first played Hot Numbers as a last-minute Sunday Sessions fill-in.',
    contact: {
      email: 'joe@joemagee.music',
      phone: '+44 7700 900218',
      instagram: '@joemageemusic',
      spotify: 'Joe Magee',
      youtube: 'Joe Magee',
    },
    media: [
      { type: 'photo', label: 'Press photo · uploaded 2 Sep' },
    ],
    gigHistory: [
      { date: '18 Aug 2024', name: 'Sunday Sessions' },
    ],
    uploadToken: 'k2jm4e8q1n6w',
    linkGeneratedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'tom-challenger-trio',
    initials: 'TC',
    name: 'Tom Challenger Trio',
    tagline: 'Sax-led jazz trio · London',
    gigs: 2,
    assets: 'none',
    bio: 'The Tom Challenger Trio is a sax-led jazz group drawing on spiritual jazz and British improvisation. Their Hot Numbers sets tend to run long and loud for a cafe crowd — in the best way.',
    contact: {
      email: 'booking@tomchallenger.com',
      phone: '+44 7700 900331',
      instagram: '@tomchallengertrio',
      spotify: 'Tom Challenger Trio',
      youtube: 'Tom Challenger',
    },
    media: [],
    gigHistory: [
      { date: '21 Jul 2024', name: 'Discovery Sessions' },
      { date: '12 Nov 2023', name: 'Sunday Sessions' },
    ],
    uploadToken: 'm4tc7r2h9b0x',
    linkGeneratedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'sarathy-korwar',
    initials: 'SK',
    name: 'Sarathy Korwar feat. Nour',
    tagline: 'Percussionist & composer',
    gigs: 1,
    assets: 'none',
    bio: 'Sarathy Korwar is a percussionist and composer fusing Indian classical rhythm with jazz and electronic music. This booking is a special set featuring vocalist Nour.',
    contact: {
      email: 'hello@sarathykorwar.com',
      phone: '+44 7700 900447',
      instagram: '@sarathykorwar',
      spotify: 'Sarathy Korwar',
      youtube: 'Sarathy Korwar',
    },
    media: [],
    gigHistory: [
      { date: '4 May 2024', name: 'Discovery Sessions' },
    ],
    uploadToken: 's8sk3r5w1n4q',
  },
  {
    id: 'eliza-parsons',
    initials: 'EP',
    name: 'Eliza Parsons',
    tagline: 'Folk, country & late-night jazz · Cambridge',
    gigs: 4,
    assets: 'received',
    bio: 'Eliza Parsons is a Cambridge singer whose songs sit in the overlap of folk, country, and late-night jazz standards. She is a regular at Sunday Sessions and has opened Discovery Sessions more than once.',
    contact: {
      email: 'eliza@elizaparsons.co.uk',
      phone: '+44 7700 900556',
      instagram: '@elizaparsonsmusic',
      spotify: 'Eliza Parsons',
      youtube: 'Eliza Parsons',
    },
    media: [
      { type: 'photo', label: 'Press photo · uploaded 28 Aug' },
      { type: 'photo', label: 'Sunday Sessions · Jan 2025' },
    ],
    links: [
      { url: 'https://www.youtube.com/watch?v=5qap5aO4i9A', label: 'Live at Hot Numbers' },
    ],
    gigHistory: [
      { date: '2 Feb 2025', name: 'Sunday Sessions' },
      { date: '14 Sep 2024', name: 'Discovery Sessions' },
      { date: '11 Feb 2024', name: 'Sunday Sessions' },
      { date: '19 Nov 2023', name: 'Discovery Sessions' },
    ],
    uploadToken: 'p1ep5s3c8d2y',
    linkGeneratedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'tomorrows-new-quartet',
    initials: 'TN',
    name: "Tomorrow's New Quartet",
    gigs: 1,
    assets: 'none',
    bio: '',
    contact: { email: '', phone: '', instagram: '', spotify: '', youtube: '' },
    media: [],
    links: [],
    gigHistory: [{ date: 'Jazz Lates', name: 'Jazz Lates at Hot Numbers' }],
    uploadToken: 't3nq8w2k5m1x',
  },
  {
    id: 'harry-christelis',
    initials: 'HC',
    name: 'Harry Christelis',
    gigs: 1,
    assets: 'none',
    bio: '',
    contact: { email: '', phone: '', instagram: '', spotify: '', youtube: '' },
    media: [],
    links: [],
    gigHistory: [{ date: 'Jazz Lates', name: 'Jazz Lates at Hot Numbers' }],
    uploadToken: 'h7ch4r1s2t9l',
  },
  {
    id: 'david-gordon',
    initials: 'DG',
    name: 'David Gordon',
    gigs: 1,
    assets: 'none',
    bio: '',
    contact: { email: '', phone: '', instagram: '', spotify: '', youtube: '' },
    media: [],
    links: [],
    gigHistory: [{ date: 'Jazz Lates', name: 'Jazz Lates at Hot Numbers' }],
    uploadToken: 'd4dg9o3r2b6n',
  },
  {
    id: 'testaments',
    initials: 'TE',
    name: 'Testaments',
    gigs: 1,
    assets: 'none',
    bio: '',
    contact: { email: '', phone: '', instagram: '', spotify: '', youtube: '' },
    media: [],
    links: [],
    gigHistory: [{ date: 'Jazz Lates', name: 'Jazz Lates at Hot Numbers' }],
    uploadToken: 't9es8t6a3m2s',
  },
  {
    id: 'john-turville-trio',
    initials: 'JT',
    name: 'John Turville Trio',
    gigs: 1,
    assets: 'none',
    bio: '',
    contact: { email: '', phone: '', instagram: '', spotify: '', youtube: '' },
    media: [],
    links: [],
    gigHistory: [{ date: '2026', name: 'Hot Numbers' }],
    uploadToken: 'j6jt9u4r2v1o',
  },
  {
    id: 'the-fontanas',
    initials: 'TF',
    name: 'The Fontanas',
    gigs: 1,
    assets: 'none',
    bio: '',
    contact: { email: '', phone: '', instagram: '', spotify: '', youtube: '' },
    media: [],
    links: [],
    gigHistory: [{ date: 'Apr 2026', name: 'International Jazz Day' }],
    uploadToken: 't5fo3n8t2a1s',
  },
]

export function slugify(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return base || 'artist'
}

export function initialsFromName(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function newUploadToken() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  }
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
}

export function actTypeOf(artist) {
  return artist?.actType === 'dj' ? 'dj' : 'live'
}

export function createArtist(name, {
  id,
  uploadToken,
  linkGeneratedAt,
  contact,
  bio,
  tagline,
  media,
  links,
  actType,
} = {}) {
  const trimmed = name.trim()
  const artist = {
    id: id || slugify(trimmed),
    initials: initialsFromName(trimmed),
    name: trimmed,
    tagline: tagline?.trim() || '',
    gigs: 0,
    bio: bio || '',
    contact: {
      email: contact?.email || '',
      phone: contact?.phone || '',
      instagram: contact?.instagram || '',
      spotify: contact?.spotify || '',
      youtube: contact?.youtube || '',
    },
    media: media || [],
    links: links || [],
    gigHistory: [],
    uploadToken: uploadToken || newUploadToken(),
    linkGeneratedAt,
    actType: actType === 'dj' ? 'dj' : 'live',
  }
  artist.assets = assetsFromArtist(artist)
  return artist
}

export function filesToMedia(files) {
  return Array.from(files).map((file) => ({
    type: file.type.startsWith('video') ? 'video' : 'photo',
    label: file.name,
    url: URL.createObjectURL(file),
  }))
}

export function withHttps(url) {
  const trimmed = (url || '').trim()
  if (!trimmed) return ''
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function isYoutubeUrl(url) {
  return /youtu\.be|youtube\.com/i.test(url || '')
}

export function linkLabel(link) {
  const label = link?.label?.trim()
  if (label) return label
  try {
    return new URL(withHttps(link.url)).hostname.replace(/^www\./, '')
  } catch {
    return link?.url || 'Link'
  }
}

export function socialHref(kind, value) {
  const v = (value || '').trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v) || v.startsWith('www.')) return withHttps(v)
  if (kind === 'instagram') return `https://instagram.com/${v.replace(/^@/, '')}`
  if (kind === 'spotify') return `https://open.spotify.com/search/${encodeURIComponent(v)}`
  if (kind === 'youtube') return `https://www.youtube.com/results?search_query=${encodeURIComponent(v)}`
  return withHttps(v)
}

export function assetFlags(artist) {
  const media = artist?.media ?? []
  const links = artist?.links ?? []
  return {
    bio: Boolean(artist?.bio?.trim()),
    photos: media.some((m) => m.type === 'photo'),
    videos: media.some((m) => m.type === 'video') || links.some((l) => isYoutubeUrl(l.url)),
  }
}

export function assetsFromArtist(artist) {
  const { bio, photos, videos } = assetFlags(artist)
  const n = [bio, photos, videos].filter(Boolean).length
  if (n === 3) return 'received'
  if (n > 0) return 'partial'
  if (artist?.linkGeneratedAt) return 'sent'
  return 'none'
}

export function uploadUrl(token, origin = typeof window !== 'undefined' ? window.location.origin : '') {
  return token ? `${origin}/u/${token}` : ''
}

export function assetsReceived(artist) {
  return assetsFromArtist(artist) === 'received'
}

export function assetsFromMedia(media, artist = {}) {
  return assetsFromArtist({ ...artist, media })
}

export function getArtist(id, list = artists) {
  return list.find((a) => a.id === id)
}

export function getArtistByToken(token, list = artists) {
  return list.find((a) => a.uploadToken === token)
}

export function uniqueArtistId(name, existing) {
  const base = slugify(name)
  if (!existing.some((a) => a.id === base)) return base
  let n = 2
  while (existing.some((a) => a.id === `${base}-${n}`)) n += 1
  return `${base}-${n}`
}
