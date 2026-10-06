import { useEffect, useState } from 'react'
import MediaPreviewModal from './MediaPreviewModal'
import MediaWall from './MediaWall'
import { linkLabel, linkSource } from '../data/artists'
import { formatClock, toggleAudio, useAudioPlayer } from '../lib/audioPlayer'
import { SOCIAL_KINDS, downloadPressKit, listenLinksOf, pressKitData, staffPreviewNote } from '../lib/pressKit'
import {
  IconArrowUpRight,
  IconBrandInstagram,
  IconBrandSpotify,
  IconBrandYoutube,
  IconCheck,
  IconCircleDashed,
  IconCopy,
  IconDownload,
  IconEye,
  IconMail,
  IconMusic,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
} from '@tabler/icons-react'

const CONSENT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatConsentDate(ms) {
  const date = new Date(ms)
  return `${date.getDate()} ${CONSENT_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function PermissionChip({ consent }) {
  if (!consent?.agreedAt) {
    return (
      <span className="pk-permission is-missing">
        <IconCircleDashed size={14} stroke={1.8} aria-hidden="true" />
        No permission recorded
      </span>
    )
  }
  return (
    <span className="pk-permission is-granted">
      <IconCheck size={14} stroke={2.2} aria-hidden="true" />
      Permission granted · {formatConsentDate(consent.agreedAt)}
    </span>
  )
}

const SOCIAL_ICONS = {
  instagram: IconBrandInstagram,
  spotify: IconBrandSpotify,
  youtube: IconBrandYoutube,
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const WAVE_BARS = [8, 16, 24, 12, 28, 16, 32, 20, 10, 24, 14, 30, 18, 8, 22, 12, 26, 16, 6]

function trackTitle(label) {
  const name = (label || 'Audio').trim()
  return name.replace(/\.(mp3|wav|m4a|aac|flac|ogg|aiff|aif|wma|opus|webm|mp4)$/i, '') || name
}

function Waveform({ progress }) {
  const played = Math.round(Math.min(1, Math.max(0, progress)) * WAVE_BARS.length)
  return (
    <svg className="pk-wave" viewBox="0 0 114 40" aria-hidden="true">
      {WAVE_BARS.map((height, index) => {
        const x = 3 + index * 6
        const y = (40 - height) / 2
        return (
          <path
            key={index}
            d={`M${x} ${y}v${height}`}
            stroke={index < played ? 'var(--ink)' : 'var(--line-dash)'}
          />
        )
      })}
    </svg>
  )
}

function useTrackDuration(url) {
  const [duration, setDuration] = useState(0)
  useEffect(() => {
    if (!url) return undefined
    const audio = new Audio()
    audio.preload = 'metadata'
    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration)
    }
    audio.addEventListener('loadedmetadata', onMeta)
    audio.src = url
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.src = ''
    }
  }, [url])
  return duration
}

function ListenTrack({ item, player, allowDownload }) {
  const [saving, setSaving] = useState(false)
  const storedDuration = useTrackDuration(item.url)
  const title = trackTitle(item.label)
  const active = player.url === item.url
  const playing = active && player.playing
  const duration = active && player.duration ? player.duration : storedDuration
  const current = active ? player.currentTime : 0
  const progress = duration > 0 ? Math.min(1, current / duration) : 0
  const elapsed = formatClock(current)
  const total = formatClock(duration)
  const started = playing || current > 0.25

  async function download() {
    if (!allowDownload || saving) return
    setSaving(true)
    try {
      const blob = await (await fetch(item.url)).blob()
      const file = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: item.label || `${title}.mp3`,
      })
      document.body.appendChild(file)
      file.click()
      file.remove()
      window.setTimeout(() => URL.revokeObjectURL(file.href), 1000)
    } catch {
      // A file that can't be fetched stays on the card so the rest of the kit still works.
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={'pk-listen-row' + (playing ? ' is-playing' : '')}>
      <button
        type="button"
        className="pk-listen-play"
        onClick={() => toggleAudio(item.url)}
        aria-label={`${playing ? 'Pause' : 'Play'} ${title}`}
      >
        {playing ? <IconPlayerPauseFilled size={16} /> : <IconPlayerPlayFilled size={16} />}
      </button>
      <div className="pk-listen-text">
        <span className="pk-listen-title">{title}</span>
        <span className="pk-listen-source">Uploaded</span>
        <span className="pk-listen-bar" aria-hidden="true">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </span>
      </div>
      <Waveform progress={playing || current > 0 ? progress : 0} />
      <span className="pk-listen-time">
        {started ? elapsed || '0:00' : total}
        {started && total ? <span className="pk-listen-total"> / {total}</span> : null}
      </span>
      {allowDownload && (
        <button
          type="button"
          className="pk-listen-download"
          onClick={download}
          disabled={saving}
          aria-label={`Download ${title}`}
        >
          <IconDownload size={18} stroke={1.6} />
        </button>
      )}
    </div>
  )
}

function ListenCard({ tracks, links, allowDownload }) {
  const player = useAudioPlayer()
  const total = tracks.length + links.length
  const countLabel = `${total} ${total === 1 ? 'track' : 'tracks'}`
  return (
    <section className="pk-card pk-listen" aria-label="Listen">
      <div className="pk-listen-head">
        <div className="pk-label">Listen</div>
        <div className="pk-listen-count">{countLabel}</div>
      </div>
      {tracks.map((item, index) => (
        <ListenTrack
          key={item.url || `${item.label}-${index}`}
          item={item}
          player={player}
          allowDownload={allowDownload}
        />
      ))}
      {links.map((link, index) => (
        <a
          key={`${link.url}-${index}`}
          className="pk-listen-link"
          href={link.url}
          target="_blank"
          rel="noreferrer"
        >
          <span className="pk-listen-mark" aria-hidden="true">
            <IconMusic size={18} stroke={1.6} />
          </span>
          <span className="pk-listen-text">
            <span className="pk-listen-title">{linkLabel(link)}</span>
            <span className="pk-listen-source">{linkSource(link.url)}</span>
          </span>
          <span className="pk-listen-badge">{link.kind}</span>
          <IconArrowUpRight className="pk-listen-arrow" size={16} stroke={1.6} aria-hidden="true" />
        </a>
      ))}
    </section>
  )
}

function CopyIconButton({ text, label, className = '' }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!(await copyText(text))) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      className={'pk-copy' + (className ? ` ${className}` : '') + (copied ? ' is-copied' : '')}
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? 'Copied' : `Copy ${label}`}
    >
      {copied ? <IconCheck size={15} stroke={2} /> : <IconCopy size={15} stroke={1.6} />}
    </button>
  )
}

export default function PressKitView({
  artist,
  publicView = false,
  preview = false,
  allowDownload = true,
  staffActions = null,
  onDownload,
}) {
  const [downloading, setDownloading] = useState(false)
  const [previewItem, setPreviewItem] = useState(null)
  const [bioCopied, setBioCopied] = useState(false)

  const { bio, email, photos, videos, audio, youtubeLinks, socials } = pressKitData(artist)
  const canDownload = allowDownload && ((artist.media ?? []).some((item) => item.url) || Boolean(bio))
  const heroPhoto = photos.find((p) => p.url)
  const tagline = artist.tagline?.trim()
  const instagram = socials.find((s) => s.key === 'instagram')
  const gigs = (artist.gigHistory ?? []).filter((gig) => gig?.name)
  const listenLinks = listenLinksOf(artist)
  const hasPanel = Boolean(bio) || Boolean(instagram) || Boolean(email) || gigs.length > 0
  const hasWall = photos.length > 0 || videos.length > 0 || youtubeLinks.length > 0
  const hasListen = audio.length > 0 || listenLinks.length > 0
  const hasMain = hasWall || hasListen

  async function download(options) {
    if (downloading) return
    onDownload?.(options?.photosOnly ? 'photos' : 'all')
    setDownloading(true)
    try {
      await downloadPressKit(artist, options)
    } finally {
      setDownloading(false)
    }
  }

  function downloadAll() {
    if (downloading) return
    if (bio) {
      copyText(bio).then((ok) => {
        if (!ok) return
        setBioCopied(true)
        window.setTimeout(() => setBioCopied(false), 3500)
      })
    }
    download()
  }

  const kit = (
    <div className={'pk' + (publicView ? ' pk-is-public' : '') + (preview ? ' pk-is-preview' : '')}>
      {staffActions && (
        <div className="pk-staff-bar">
          <span className="pk-staff-bar-note">
            <IconEye size={16} stroke={1.6} aria-hidden="true" />
            {staffPreviewNote(artist)}
          </span>
          <PermissionChip consent={artist.consent} />
          {staffActions}
        </div>
      )}
      <div className="pk-body">
        <div className="pk-brand">
          <img src="/HN%20logo.png" alt="" className="pk-brand-logo" />
          <span className="pk-brand-name">Hot Numbers</span>
          <span className="pk-brand-sub">· Artist press kit</span>
        </div>

        <header className="pk-hero">
          {heroPhoto && <img src={heroPhoto.url} alt="" className="pk-hero-img" />}
          <div className="pk-hero-overlay">
            <div className="pk-hero-text">
              {tagline && <div className="pk-tagline">{tagline}</div>}
              <h1 className="pk-name">{artist.name}</h1>
            </div>
            {preview && (
              <div className="pk-hero-actions" aria-hidden="true">
                {SOCIAL_KINDS.map((s) => {
                  const Icon = SOCIAL_ICONS[s.key]
                  return (
                    <span key={s.key} className="pk-social-circle">
                      <Icon size={20} stroke={1.5} />
                    </span>
                  )
                })}
                <span className="pk-download is-dummy">
                  <IconMail size={18} stroke={1.8} />
                  Email
                </span>
              </div>
            )}
            {!preview && (socials.length > 0 || canDownload) && (
              <div className="pk-hero-actions">
                {socials.map((s) => {
                  const Icon = SOCIAL_ICONS[s.key]
                  return (
                    <a key={s.key} className="pk-social-circle" href={s.href} target="_blank" rel="noreferrer" aria-label={s.name}>
                      <Icon size={20} stroke={1.5} />
                    </a>
                  )
                })}
                {canDownload && (
                  <button
                    type="button"
                    className="pk-download"
                    title="Photos, videos and audio (.zip) and bio (.md)"
                    onClick={downloadAll}
                    disabled={downloading}
                  >
                    <IconDownload size={18} stroke={2} />
                    {downloading ? 'Preparing zip…' : 'Download all'}
                  </button>
                )}
                {bioCopied && (
                  <span className="pk-download-note" role="status">
                    <IconCheck size={15} stroke={2.2} />
                    Bio copied to clipboard
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {(hasPanel || hasMain) && (
          <div className={'pk-grid' + (hasPanel && hasMain ? '' : ' is-single')}>
            {hasPanel && (
              <aside className="pk-col pk-panel">
                {bio && (
                  <section className="pk-card pk-about">
                    <div className="pk-label">About</div>
                    <p className="pk-bio">{bio}</p>
                  </section>
                )}

                {gigs.length > 0 && (
                  <section className="pk-card pk-played" aria-label="Played at">
                    <div className="pk-played-head">
                      <div className="pk-label">Played at</div>
                      <div className="pk-label">{gigs.length}</div>
                    </div>
                    {gigs.map((gig, index) => (
                      <div className="pk-played-row" key={`${gig.name}-${gig.date}-${index}`}>
                        <span className="pk-played-name">{gig.name}</span>
                        {gig.date ? <span className="pk-played-date">{gig.date}</span> : null}
                      </div>
                    ))}
                  </section>
                )}

                {(email || instagram) && (
                  <section className="pk-card pk-booking">
                    <div className="pk-label">Booking &amp; contact</div>
                    {email && (
                      <div className="pk-booking-row">
                        <a className="pk-booking-email" href={`mailto:${email}`}>{email}</a>
                        <CopyIconButton text={email} label="email" className="is-on-red" />
                      </div>
                    )}
                    {instagram && (
                      <div className="pk-booking-row">
                        <a className="pk-booking-email pk-booking-social" href={instagram.href} target="_blank" rel="noreferrer">
                          <IconBrandInstagram size={20} stroke={1.6} aria-hidden="true" />
                          <span>{instagram.handle}</span>
                        </a>
                        <CopyIconButton text={instagram.href} label="Instagram link" className="is-on-red" />
                      </div>
                    )}
                  </section>
                )}
              </aside>
            )}

            {hasMain && (
              <div className="pk-col">
                {hasListen && <ListenCard tracks={audio} links={listenLinks} allowDownload={allowDownload} />}
                {hasWall && (
                  <MediaWall
                    media={artist.media}
                    youtubeLinks={youtubeLinks}
                    onOpen={(media, index) => {
                      if (preview && !media[index].url) return
                      setPreviewItem({ media, index })
                    }}
                    onDownloadPhotos={allowDownload ? () => download({ photosOnly: true }) : null}
                    downloading={downloading}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {kit}
      {previewItem && (
        <MediaPreviewModal
          media={previewItem.media}
          startIndex={previewItem.index}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </>
  )
}
