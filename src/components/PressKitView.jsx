import { useState } from 'react'
import MediaPreviewModal from './MediaPreviewModal'
import MediaWall from './MediaWall'
import { SOCIAL_KINDS, downloadPressKit, pressKitData, staffPreviewNote } from '../lib/pressKit'
import {
  IconBrandInstagram,
  IconBrandSpotify,
  IconBrandYoutube,
  IconCheck,
  IconCircleDashed,
  IconCopy,
  IconDownload,
  IconEye,
  IconMail,
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

  const { bio, email, photos, youtubeLinks, socials } = pressKitData(artist)
  const canDownload = allowDownload && (artist.media.some((m) => m.url) || Boolean(bio))
  const heroPhoto = photos.find((p) => p.url)
  const tagline = artist.tagline?.trim()
  const instagram = socials.find((s) => s.key === 'instagram')
  const hasPanel = Boolean(bio) || Boolean(instagram) || Boolean(email)
  const hasWall = artist.media.length > 0 || youtubeLinks.length > 0

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
                    title="Photos + videos (.zip) and bio (.md)"
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

        {(hasPanel || hasWall) && (
          <div className={'pk-grid' + (hasPanel && hasWall ? '' : ' is-single')}>
            {hasPanel && (
              <aside className="pk-col pk-panel">
                {bio && (
                  <section className="pk-card pk-about">
                    <div className="pk-label">About</div>
                    <p className="pk-bio">{bio}</p>
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
