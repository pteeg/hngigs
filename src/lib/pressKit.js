import { audioLinkKind, isYoutubeUrl, linkLabel, socialHref } from '../data/artists'

export const SOCIAL_KINDS = [
  { key: 'instagram', name: 'Instagram' },
  { key: 'spotify', name: 'Spotify' },
  { key: 'youtube', name: 'YouTube' },
]

export function youtubeId(url) {
  const match = (url || '').match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/)
  return match ? match[1] : null
}

export function listenLinksOf(artist) {
  return (artist?.links ?? []).flatMap((link) => {
    const kind = audioLinkKind(link.url)
    return kind ? [{ ...link, kind }] : []
  })
}

export function pressKitData(artist) {
  const media = artist?.media ?? []
  const photos = media.filter((m) => m.type === 'photo')
  const videos = media.filter((m) => m.type === 'video')
  const audio = media.filter((m) => m.type === 'audio' && m.url)
  const youtubeLinks = (artist?.links ?? []).filter((l) => isYoutubeUrl(l.url))
  const socials = SOCIAL_KINDS
    .map((kind) => ({ ...kind, handle: artist?.contact?.[kind.key]?.trim() || '' }))
    .filter((s) => s.handle)
    .map((s) => ({ ...s, href: socialHref(s.key, s.handle) }))
  const bio = artist?.bio?.trim() || ''
  const email = artist?.contact?.email?.trim() || ''

  return { bio, email, photos, videos, audio, youtubeLinks, socials }
}

export function staffPreviewNote(artist) {
  const { bio, email, photos, videos, audio, youtubeLinks, socials } = pressKitData(artist)
  const missing = []
  if (!bio) missing.push('bio')
  if (photos.length === 0) missing.push('photos')
  if (videos.length === 0 && audio.length === 0 && youtubeLinks.length === 0 && listenLinksOf(artist).length === 0) missing.push('videos')
  if (socials.length === 0) missing.push('socials')
  if (!email) missing.push('contact')
  if (missing.length === 0) return 'Public preview. This is what promoters and press see.'
  const noun = missing.length === 1 ? 'section' : 'sections'
  const verb = missing.length === 1 ? 'stays' : 'stay'
  return `Public preview. ${missing.length} ${noun} (${missing.join(', ')}) ${verb} hidden until received.`
}

export function bioFile(artist) {
  const { bio } = pressKitData(artist)
  const gigs = (artist?.gigHistory ?? []).filter((gig) => gig?.name)
  const parts = []
  if (bio) parts.push(`Bio:\n${bio}`)
  if (gigs.length) {
    const lines = gigs.map((gig) => (gig.date ? `- ${gig.name} · ${gig.date}` : `- ${gig.name}`))
    parts.push(`## Played at\n${lines.join('\n')}`)
  }
  const links = listenLinksOf(artist)
  if (links.length) {
    const lines = links.map((link) => `- ${linkLabel(link)} · ${link.kind} · ${link.url}`)
    parts.push(`## Links\n${lines.join('\n')}`)
  }
  return parts.length ? `${parts.join('\n\n')}\n` : ''
}

function extensionFor(blob, type, label) {
  const fromLabel = String(label || '').match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase()
  if (type === 'audio' && fromLabel) return fromLabel
  const fromMime = (blob.type.split('/')[1] || '').split(';')[0]
    .replace('jpeg', 'jpg')
    .replace('quicktime', 'mov')
    .replace('mpeg', 'mp3')
    .replace('x-wav', 'wav')
    .replace('x-m4a', 'm4a')
  if (type === 'audio') return fromMime && fromMime !== 'octet-stream' ? fromMime : 'mp3'
  return fromMime || (type === 'video' ? 'mp4' : 'jpg')
}

function folderFor(type) {
  if (type === 'video') return 'videos'
  if (type === 'audio') return 'audio'
  return 'photos'
}

export async function downloadPressKit(artist, { photosOnly = false } = {}) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const slug = artist.id
  const items = (artist.media ?? []).filter((m) => m.url && (!photosOnly || m.type === 'photo'))
  const counters = { photo: 0, video: 0, audio: 0 }
  const numbered = items.map((m) => ({ ...m, n: (counters[m.type] = (counters[m.type] ?? 0) + 1) }))

  await Promise.all(
    numbered.map(async (m) => {
      try {
        const blob = await (await fetch(m.url)).blob()
        const name = `${slug}-${String(m.n).padStart(2, '0')}.${extensionFor(blob, m.type, m.label)}`
        zip.folder(folderFor(m.type)).file(name, blob)
      } catch {
        // A file that can't be fetched is skipped so the rest still downloads.
      }
    }),
  )
  const markdown = bioFile(artist)
  if (!photosOnly && markdown) zip.file(`${slug}-bio.md`, markdown)

  const out = await zip.generateAsync({ type: 'blob' })
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(out),
    download: `${slug}-${photosOnly ? 'photos' : 'press-kit'}.zip`,
  })
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
