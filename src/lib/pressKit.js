import { isYoutubeUrl, linkLabel, socialHref } from '../data/artists'

export const SOCIAL_KINDS = [
  { key: 'instagram', name: 'Instagram' },
  { key: 'spotify', name: 'Spotify' },
  { key: 'youtube', name: 'YouTube' },
]

export function youtubeId(url) {
  const match = (url || '').match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/)
  return match ? match[1] : null
}

export function pressKitData(artist) {
  const media = artist?.media ?? []
  const photos = media.filter((m) => m.type === 'photo')
  const videos = media.filter((m) => m.type === 'video')
  const youtubeLinks = (artist?.links ?? []).filter((l) => isYoutubeUrl(l.url))
  const socials = SOCIAL_KINDS
    .map((kind) => ({ ...kind, handle: artist?.contact?.[kind.key]?.trim() || '' }))
    .filter((s) => s.handle)
    .map((s) => ({ ...s, href: socialHref(s.key, s.handle) }))
  const bio = artist?.bio?.trim() || ''
  const email = artist?.contact?.email?.trim() || ''

  return { bio, email, photos, videos, youtubeLinks, socials }
}

export function bioMarkdown(artist) {
  const { bio, email, socials } = pressKitData(artist)
  const lines = [`# ${artist.name}`]
  if (artist.tagline?.trim()) lines.push(artist.tagline.trim())
  if (bio) lines.push('', bio)

  const links = [
    ...socials.map((s) => `- ${s.name}: ${s.href}`),
    ...(artist.links ?? []).map((l) => `- ${linkLabel(l)}: ${l.url}`),
  ]
  if (links.length) lines.push('', '## Links', ...links)


  if (email) lines.push('', '## Booking & contact', email)
  return lines.join('\n') + '\n'
}

function extensionFor(blob, type) {
  const fromMime = (blob.type.split('/')[1] || '').split(';')[0].replace('jpeg', 'jpg').replace('quicktime', 'mov')
  return fromMime || (type === 'video' ? 'mp4' : 'jpg')
}

export async function downloadPressKit(artist, { photosOnly = false } = {}) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const slug = artist.id
  const items = (artist.media ?? []).filter((m) => m.url && (!photosOnly || m.type === 'photo'))
  const counters = { photo: 0, video: 0 }
  const numbered = items.map((m) => ({ ...m, n: (counters[m.type] = (counters[m.type] ?? 0) + 1) }))

  await Promise.all(
    numbered.map(async (m) => {
      try {
        const blob = await (await fetch(m.url)).blob()
        const name = `${slug}-${String(m.n).padStart(2, '0')}.${extensionFor(blob, m.type)}`
        zip.folder(m.type === 'video' ? 'videos' : 'photos').file(name, blob)
      } catch {
        // A file that can't be fetched is skipped so the rest still downloads.
      }
    }),
  )
  if (!photosOnly) zip.file(`${slug}-bio.md`, bioMarkdown(artist))

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
