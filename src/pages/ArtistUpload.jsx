import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useArtists } from '../context/ArtistsContext'
import AssetLinks from '../components/AssetLinks'
import MediaPreviewModal from '../components/MediaPreviewModal'
import {
  IconBrandInstagram,
  IconBrandSpotify,
  IconBrandYoutube,
  IconCheck,
  IconEye,
  IconPhoto,
  IconUpload,
  IconX,
} from '@tabler/icons-react'

const SOCIALS = [
  { key: 'instagram', label: 'Instagram', Icon: IconBrandInstagram, placeholder: '@handle or URL' },
  { key: 'spotify', label: 'Spotify', Icon: IconBrandSpotify, placeholder: 'Spotify artist profile link' },
  { key: 'youtube', label: 'YouTube', Icon: IconBrandYoutube, placeholder: 'YouTube channel link' },
]

export default function ArtistUpload() {
  const { token } = useParams()
  const { getArtistByToken, ready, addMedia, removeMedia, updateBio, updateContact, addLink, removeLink, submitAssets } = useArtists()
  const artist = getArtistByToken(token)
  const fileRef = useRef(null)
  const [previewIndex, setPreviewIndex] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [savedFor, setSavedFor] = useState(null)
  const saved = Boolean(artist) && savedFor === artist.id
  const [bio, setBio] = useState(artist?.bio ?? '')
  const [socials, setSocials] = useState({
    instagram: artist?.contact.instagram ?? '',
    spotify: artist?.contact.spotify ?? '',
    youtube: artist?.contact.youtube ?? '',
  })

  useEffect(() => {
    setBio(artist?.bio ?? '')
    setSocials({
      instagram: artist?.contact.instagram ?? '',
      spotify: artist?.contact.spotify ?? '',
      youtube: artist?.contact.youtube ?? '',
    })
  }, [artist?.id, artist?.bio, artist?.contact.instagram, artist?.contact.spotify, artist?.contact.youtube])

  function onFiles(event) {
    const files = event.target.files
    if (!files?.length || !artist) return
    addMedia(artist.id, files)
    setSavedFor(null)
    event.target.value = ''
  }

  function onDrop(event) {
    event.preventDefault()
    setDragging(false)
    if (!artist) return
    const files = Array.from(event.dataTransfer.files ?? []).filter(
      (file) => file.type.startsWith('image/') || file.type.startsWith('video/'),
    )
    if (files.length) {
      addMedia(artist.id, files)
      setSavedFor(null)
    }
  }

  function onBioChange(event) {
    const value = event.target.value
    setBio(value)
    setSavedFor(null)
    if (artist) updateBio(artist.id, value)
  }

  function onSocialChange(key, value) {
    setSocials((current) => ({ ...current, [key]: value }))
    setSavedFor(null)
    if (artist) updateContact(artist.id, { [key]: value })
  }

  function save() {
    submitAssets(artist.id)
    setSavedFor(artist.id)
  }

  const brand = (
    <div className="upload-brand">
      <img src="/HN%20logo.png" alt="" className="upload-logo" />
      <div>
        <div className="upload-brand-name">Hot Numbers Gigs</div>
        <div className="upload-sub">Your Assets</div>
      </div>
    </div>
  )

  if (!ready) {
    return (
      <div className="upload-page">
        <div className="upload-column">
          {brand}
          <section className="upload-card">
            <p>Loading…</p>
          </section>
        </div>
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="upload-page">
        <div className="upload-column">
          {brand}
          <section className="upload-card">
            <p>This link isn’t valid. Ask Hot Numbers to generate a new media upload link.</p>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="upload-page">
      <div className="upload-column">
        {brand}
        <section className="upload-card">
          <div className="upload-intro">
            <h1>Hi {artist.name}!</h1>
            <p className="upload-lead">
              Please add your bio, any good photos and videos and any relevant links to media you wish to share.
            </p>
          </div>

          <div className="upload-section">
            <label className="field-label" htmlFor="upload-bio">Bio</label>
            <textarea
              id="upload-bio"
              className="upload-bio"
              value={bio}
              onChange={onBioChange}
              placeholder="A short bio for listings and press…"
              rows={6}
            />
          </div>

          <div className="upload-section">
            <div className="field-label">Socials</div>
            <div className="upload-socials">
              {SOCIALS.map(({ key, label, Icon, placeholder }) => (
                <label className="upload-social-row" key={key}>
                  <span className="upload-social-icon" aria-hidden="true">
                    <Icon size={20} stroke={1.5} />
                  </span>
                  <input
                    type="text"
                    className="input-bare"
                    aria-label={label}
                    value={socials[key]}
                    onChange={(e) => onSocialChange(key, e.target.value)}
                    placeholder={placeholder}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="upload-section">
            <div className="field-label">Photos &amp; Videos</div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={onFiles}
            />
            <button
              type="button"
              className={'dropzone' + (dragging ? ' is-dragging' : '')}
              onClick={() => fileRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <span className="dropzone-icon" aria-hidden="true">
                <IconUpload size={18} stroke={2} />
              </span>
              <span className="dropzone-title">Add files</span>
              <span className="dropzone-hint">Drop photos or videos here, or click to browse</span>
            </button>
            <AssetLinks
              links={artist.links}
              onAdd={(link) => {
                addLink(artist.id, link)
                setSavedFor(null)
              }}
              onRemove={(index) => {
                removeLink(artist.id, index)
                setSavedFor(null)
              }}
              buttonLabel="Add link to video"
            >
              {artist.media.map((item, index) => (
                <li key={item.url || item.label + index}>
                  {item.url && item.type === 'photo' ? (
                    <img src={item.url} alt="" />
                  ) : item.url && item.type === 'video' ? (
                    <video src={item.url} muted />
                  ) : (
                    <span className="upload-thumb" aria-hidden="true">
                      <IconPhoto size={18} stroke={1.5} />
                    </span>
                  )}
                  <span className="upload-item-name">{item.label}</span>
                  <button
                    type="button"
                    className="upload-preview"
                    onClick={() => setPreviewIndex(index)}
                  >
                    <IconEye size={14} stroke={1.6} />
                    Preview
                  </button>
                  <button
                    type="button"
                    className="upload-remove"
                    onClick={() => {
                      removeMedia(artist.id, index)
                      setSavedFor(null)
                    }}
                    aria-label={`Remove ${item.label}`}
                  >
                    <IconX size={15} stroke={1.6} />
                  </button>
                </li>
              ))}
            </AssetLinks>
          </div>

          <button
            type="button"
            className={'btn btn-primary btn-submit' + (saved ? ' is-saved' : '')}
            onClick={save}
            aria-live="polite"
          >
            {saved ? (
              <>
                <IconCheck size={18} stroke={2.4} />
                Saved and sent to Hot Numbers
              </>
            ) : (
              'Save'
            )}
          </button>
        </section>
      </div>
      {previewIndex != null && (
        <MediaPreviewModal
          media={artist.media}
          startIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </div>
  )
}
