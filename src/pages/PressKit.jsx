import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useArtists } from '../context/ArtistsContext'
import ArtistFormModal from '../components/ArtistFormModal'
import GetLinkModal from '../components/GetLinkModal'
import MediaPreviewModal from '../components/MediaPreviewModal'
import MediaWall from '../components/MediaWall'
import { downloadPressKit, pressKitData } from '../lib/pressKit'
import {
  IconArrowLeft,
  IconArrowUpRight,
  IconBrandInstagram,
  IconBrandSpotify,
  IconBrandYoutube,
  IconDownload,
  IconEdit,
  IconLink,
} from '@tabler/icons-react'

const SOCIAL_ICONS = {
  instagram: IconBrandInstagram,
  spotify: IconBrandSpotify,
  youtube: IconBrandYoutube,
}

export default function PressKit({ publicView = false }) {
  const { id } = useParams()
  const { getArtist, ensureUploadLink, ready } = useArtists()
  const artist = getArtist(id)
  const navigate = useNavigate()
  const [downloading, setDownloading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [linkRequest, setLinkRequest] = useState(null)
  const [previewItem, setPreviewItem] = useState(null)

  if (!ready) {
    return (
      <div className={publicView ? 'pk-public' : 'pk-staff'}>
        {!publicView && <BackLink />}
        <p className="pk-missing">Loading artist…</p>
      </div>
    )
  }

  if (!artist) {
    return (
      <div className={publicView ? 'pk-public' : 'pk-staff'}>
        {!publicView && <BackLink />}
        <p className="pk-missing">Artist not found.</p>
      </div>
    )
  }

  const { bio, email, photos, youtubeLinks, socials } = pressKitData(artist)
  const canDownload = artist.media.some((m) => m.url) || Boolean(bio)
  const heroPhoto = photos.find((p) => p.url)
  const tagline = artist.tagline?.trim()
  const hasPanel = Boolean(bio) || socials.length > 0 || Boolean(email)
  const hasWall = artist.media.length > 0 || youtubeLinks.length > 0

  async function download(options) {
    if (downloading) return
    setDownloading(true)
    try {
      await downloadPressKit(artist, options)
    } finally {
      setDownloading(false)
    }
  }

  function openGetLink() {
    const next = ensureUploadLink(artist.id)
    if (next?.uploadToken) setLinkRequest(next)
  }

  const kit = (
    <div className={'pk' + (publicView ? ' pk-is-public' : '')}>
      <div className="pk-body">
        <div className="pk-brand">
          <img src="/HN%20logo.png" alt="" className="pk-brand-logo" />
          <span className="pk-brand-name">Hot Numbers</span>
          <span className="pk-brand-sub">· Artist press kit</span>
        </div>

        <header className="pk-hero">
          {heroPhoto && <img src={heroPhoto.url} alt="" className="pk-hero-img" />}
          {!publicView && (
            <div className="pk-hero-staff">
              <button type="button" className="pk-hero-btn" onClick={() => setEditOpen(true)}>
                <IconEdit size={15} stroke={1.5} />
                Edit
              </button>
              <button type="button" className="pk-hero-btn" onClick={openGetLink}>
                <IconLink size={15} stroke={1.5} />
                Request assets
              </button>
            </div>
          )}
          <div className="pk-hero-overlay">
            <div className="pk-hero-text">
              {tagline && <div className="pk-tagline">{tagline}</div>}
              <h1 className="pk-name">{artist.name}</h1>
            </div>
            {(socials.length > 0 || canDownload) && (
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
                    onClick={() => download()}
                    disabled={downloading}
                  >
                    <IconDownload size={18} stroke={2} />
                    {downloading ? 'Preparing zip…' : 'Download all'}
                  </button>
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

                {socials.length > 0 && (
                  <section className="pk-card pk-follow" aria-label="Listen and follow">
                    {socials.map((s) => {
                      const Icon = SOCIAL_ICONS[s.key]
                      return (
                        <a key={s.key} className="pk-follow-row" href={s.href} target="_blank" rel="noreferrer">
                          <span className="pk-follow-icon" aria-hidden="true">
                            <Icon size={18} stroke={1.5} />
                          </span>
                          <span className="pk-follow-text">
                            <span className="pk-follow-name">{s.name}</span>
                            <span className="pk-follow-handle">{s.handle}</span>
                          </span>
                          <IconArrowUpRight size={16} stroke={1.8} className="pk-follow-arrow" />
                        </a>
                      )
                    })}
                  </section>
                )}

                {email && (
                  <section className="pk-card pk-booking">
                    <div className="pk-label">Booking &amp; contact</div>
                    <a className="pk-booking-email" href={`mailto:${email}`}>{email}</a>
                  </section>
                )}
              </aside>
            )}

            {hasWall && (
              <MediaWall
                media={artist.media}
                youtubeLinks={youtubeLinks}
                onOpen={(media, index) => setPreviewItem({ media, index })}
                onDownloadPhotos={() => download({ photosOnly: true })}
                downloading={downloading}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className={publicView ? 'pk-public' : 'pk-staff'} data-artist-id={artist.id}>
      {!publicView && <BackLink />}
      {kit}

      {editOpen && (
        <ArtistFormModal
          artist={artist}
          onClose={() => setEditOpen(false)}
          onDeleted={() => navigate('/artists', { replace: true })}
        />
      )}
      {linkRequest && <GetLinkModal artist={linkRequest} onClose={() => setLinkRequest(null)} />}
      {previewItem && (
        <MediaPreviewModal
          media={previewItem.media}
          startIndex={previewItem.index}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  )
}

function BackLink() {
  return (
    <div className="pk-back-row">
      <Link to="/artists" className="pk-back">
        <IconArrowLeft size={15} stroke={1.8} />
        All artists
      </Link>
    </div>
  )
}
