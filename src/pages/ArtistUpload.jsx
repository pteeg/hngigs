import { useEffect, useId, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useArtists } from '../context/ArtistsContext'
import AssetLinks from '../components/AssetLinks'
import MediaPreviewModal from '../components/MediaPreviewModal'
import UploadDone from '../components/UploadDone'
import { formatClock, stopAudio, toggleAudio, useAudioPlayer } from '../lib/audioPlayer'
import { MAX_AUDIO_MB, MAX_MEDIA, MAX_PHOTO_MB, MAX_VIDEO_MB, mediaProblem, mediaTypeOf } from '../lib/media'
import { track, trackOncePerSession } from '../lib/track'
import { isValidWaitlistEmail } from '../lib/waitlist'
import {
  IconBrandInstagram,
  IconBrandSpotify,
  IconBrandYoutube,
  IconCheck,
  IconEye,
  IconInfoCircle,
  IconMail,
  IconMusic,
  IconPhoto,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlus,
  IconUpload,
  IconX,
} from '@tabler/icons-react'

const VENUE_LIMIT = 8
let gigSeq = 0

function gigKey() {
  gigSeq += 1
  return `gig-${gigSeq}`
}

function gigsToSave(rows) {
  return rows
    .map((row) => ({ name: row.name.trim(), date: row.date.trim() }))
    .filter((row) => row.name)
    .slice(0, VENUE_LIMIT)
}

function rowsFromHistory(history) {
  return (history ?? [])
    .filter((gig) => gig?.name)
    .map((gig) => ({ key: gigKey(), name: gig.name, date: gig.date || '' }))
}

const CONSENT_COPY = 'By uploading, I confirm I own or have the right to share this content, and I grant Hot Numbers and its promoters permission to use it to promote my performances, including on social media.'

const SOCIALS = [
  { key: 'instagram', label: 'Instagram', Icon: IconBrandInstagram, placeholder: '@handle or URL' },
  { key: 'spotify', label: 'Spotify', Icon: IconBrandSpotify, placeholder: 'Spotify artist profile link' },
  { key: 'youtube', label: 'YouTube', Icon: IconBrandYoutube, placeholder: 'YouTube channel link' },
]

function countFiles(files) {
  const list = Array.from(files)
  return {
    photos: list.filter((file) => file.type.startsWith('image/')).length,
    videos: list.filter((file) => file.type.startsWith('video/')).length,
    audio: list.filter((file) => file.type.startsWith('audio/')).length,
  }
}

function useAudioDuration(url) {
  const [duration, setDuration] = useState('')
  useEffect(() => {
    if (!url) return undefined
    const audio = new Audio()
    audio.preload = 'metadata'
    const onMeta = () => setDuration(formatClock(audio.duration))
    audio.addEventListener('loadedmetadata', onMeta)
    audio.src = url
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.src = ''
    }
  }, [url])
  return duration
}

function useFinePointer() {
  const [fine, setFine] = useState(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)')
    const sync = () => setFine(query.matches)
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])
  return fine
}

function UploadLimitsNote() {
  const noteId = useId()
  const rootRef = useRef(null)
  const finePointer = useFinePointer()
  const [pinned, setPinned] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [focused, setFocused] = useState(false)
  const [suppress, setSuppress] = useState(false)
  const open = pinned || (finePointer && !suppress && (hovering || focused))
  const openBeforePress = useRef(false)

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setPinned(false)
        setHovering(false)
        setFocused(false)
        setSuppress(false)
      }
    }
    function onKeyDown(event) {
      if (event.key !== 'Escape') return
      setPinned(false)
      setHovering(false)
      setFocused(false)
      setSuppress(true)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function onPressStart() {
    openBeforePress.current = open
  }

  function onClick() {
    if (openBeforePress.current) {
      setPinned(false)
      setFocused(false)
      setSuppress(true)
    } else {
      setPinned(true)
      setSuppress(false)
    }
  }

  return (
    <div
      className="upload-limits"
      ref={rootRef}
      onMouseEnter={() => {
        if (finePointer && !suppress) setHovering(true)
      }}
      onMouseLeave={() => {
        setHovering(false)
        setSuppress(false)
      }}
    >
      <div className="field-label">Photos, videos &amp; audio</div>
      <button
        type="button"
        className="upload-limits-btn"
        aria-label="Upload limits"
        aria-expanded={open}
        aria-controls={noteId}
        onMouseDown={onPressStart}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') onPressStart()
        }}
        onClick={onClick}
        onFocus={() => {
          if (!finePointer) return
          setSuppress(false)
          setFocused(true)
        }}
        onBlur={(event) => {
          if (rootRef.current?.contains(event.relatedTarget)) return
          setFocused(false)
        }}
      >
        <IconInfoCircle size={16} stroke={1.8} />
      </button>
      {open && (
        <p className="upload-limits-pop" id={noteId} role="note">
          Up to {MAX_MEDIA} files. Photos up to {MAX_PHOTO_MB} MB, audio up to {MAX_AUDIO_MB} MB, video up to {MAX_VIDEO_MB} MB.
        </p>
      )}
    </div>
  )
}

function AudioFileRow({ item, index, playing, onPlay, onRemove }) {
  const duration = useAudioDuration(item.url)
  const meta = duration ? `Audio · ${duration}` : 'Audio'
  return (
    <li>
      <span className="upload-thumb is-audio" aria-hidden="true">
        <IconMusic size={20} stroke={1.6} />
      </span>
      <span className="upload-item-copy">
        <span className="upload-item-name">{item.label}</span>
        <span className="upload-item-meta">{meta}</span>
      </span>
      <button type="button" className="upload-preview is-play" onClick={() => onPlay(item.url)}>
        {playing ? <IconPlayerPauseFilled size={12} /> : <IconPlayerPlayFilled size={12} />}
        {playing ? 'Pause' : 'Play'}
      </button>
      <button
        type="button"
        className="upload-remove"
        onClick={() => onRemove(index)}
        aria-label={`Remove ${item.label}`}
      >
        <IconX size={15} stroke={1.6} />
      </button>
    </li>
  )
}

export default function ArtistUpload() {
  const { token } = useParams()
  const { getArtistByToken, ready, uploadMedia, removeMedia, updateBio, updateContact, updateGigHistory, addLink, removeLink, submitAssets } = useArtists()
  const artist = getArtistByToken(token)
  const fileRef = useRef(null)
  const [previewIndex, setPreviewIndex] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [savedFor, setSavedFor] = useState(null)
  const saved = Boolean(artist) && savedFor === artist.id
  const [openedAt] = useState(() => Date.now())
  const loggedOpen = useRef('')
  const [loadedFor, setLoadedFor] = useState(artist?.id)
  const [bio, setBio] = useState(artist?.bio ?? '')
  const [socials, setSocials] = useState({
    instagram: artist?.contact.instagram ?? '',
    spotify: artist?.contact.spotify ?? '',
    youtube: artist?.contact.youtube ?? '',
  })
  const [email, setEmail] = useState(artist?.contact.email ?? '')
  const [emailError, setEmailError] = useState(false)
  const [agreed, setAgreed] = useState(Boolean(artist?.consent))
  const [consentError, setConsentError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [gigs, setGigs] = useState(() => rowsFromHistory(artist?.gigHistory))
  const [uploads, setUploads] = useState([])
  const [uploadNotice, setUploadNotice] = useState('')
  const player = useAudioPlayer()
  const uploading = uploads.some((upload) => !upload.failed)
  const unsaved = useRef({ artistId: null, bio: null, contact: null, gigs: null, timer: null })

  // Fields are only loaded once per artist; later remote updates would clobber text still being typed.
  if (artist && loadedFor !== artist.id) {
    setLoadedFor(artist.id)
    setBio(artist.bio ?? '')
    setSocials({
      instagram: artist.contact.instagram ?? '',
      spotify: artist.contact.spotify ?? '',
      youtube: artist.contact.youtube ?? '',
    })
    setEmail(artist.contact.email ?? '')
    setAgreed(Boolean(artist.consent))
    setConsentError(false)
    setGigs(rowsFromHistory(artist.gigHistory))
  }

  const flushRef = useRef(() => {})
  useEffect(() => {
    flushRef.current = () => {
      const edits = unsaved.current
      window.clearTimeout(edits.timer)
      if (edits.artistId && edits.bio != null) updateBio(edits.artistId, edits.bio)
      if (edits.artistId && edits.contact) updateContact(edits.artistId, edits.contact)
      if (edits.artistId && edits.gigs != null) updateGigHistory(edits.artistId, edits.gigs)
      unsaved.current = { artistId: null, bio: null, contact: null, gigs: null, timer: null }
    }
  }, [updateBio, updateContact, updateGigHistory])

  useEffect(() => {
    const flush = () => flushRef.current()
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])

  function queueEdit(edit) {
    const edits = unsaved.current
    window.clearTimeout(edits.timer)
    edits.artistId = artist.id
    if (edit.bio != null) edits.bio = edit.bio
    if (edit.contact) edits.contact = { ...edits.contact, ...edit.contact }
    if (edit.gigs != null) edits.gigs = edit.gigs
    edits.timer = window.setTimeout(() => flushRef.current(), 600)
  }

  useEffect(() => {
    if (!artist || loggedOpen.current === artist.id) return
    loggedOpen.current = artist.id
    track('upload_link_opened', artist.id)
    if (artist.submittedAt) track('returned_visit', artist.id)
  }, [artist])

  function startUploads(files) {
    if (!artist) return
    const room = MAX_MEDIA - artist.media.length - uploads.filter((upload) => !upload.failed).length
    const accepted = []
    const problems = []
    for (const file of Array.from(files ?? [])) {
      const problem = mediaProblem(file)
      if (problem) problems.push(problem)
      else if (accepted.length < room) accepted.push(file)
      else problems.push(`${file.name} wasn’t added. You can add up to ${MAX_MEDIA} files.`)
    }
    setUploadNotice(problems.join(' '))
    if (!accepted.length) return
    const counts = countFiles(accepted)
    track('media_added', artist.id, { photos: counts.photos, videos: counts.videos })
    setSavedFor(null)
    for (const file of accepted) {
      const key = `${Date.now()}-${Math.random()}`
      const patch = (change) =>
        setUploads((current) => current.map((upload) => (upload.key === key ? { ...upload, ...change } : upload)))
      setUploads((current) => [...current, { key, name: file.name, progress: 0, failed: false, type: mediaTypeOf(file) }])
      uploadMedia(artist.id, file, (progress) => patch({ progress }))
        .then(() => setUploads((current) => current.filter((upload) => upload.key !== key)))
        .catch((error) => {
          console.error('Upload failed', file.name, error)
          patch({ failed: true })
        })
    }
  }

  function dismissUpload(key) {
    setUploads((current) => current.filter((upload) => upload.key !== key))
  }

  function onFiles(event) {
    startUploads(event.target.files)
    event.target.value = ''
  }

  function onDrop(event) {
    event.preventDefault()
    setDragging(false)
    startUploads(event.dataTransfer.files)
  }

  function onBioChange(event) {
    const value = event.target.value
    setBio(value)
    setSavedFor(null)
    if (!artist) return
    trackOncePerSession('bio_edited', artist.id)
    queueEdit({ bio: value })
  }

  function onSocialChange(key, value) {
    setSocials((current) => ({ ...current, [key]: value }))
    setSavedFor(null)
    if (artist) queueEdit({ contact: { [key]: value } })
  }

  function onEmailChange(value) {
    setEmail(value)
    setEmailError(false)
    setSavedFor(null)
    const clean = value.trim()
    if (artist && (!clean || isValidWaitlistEmail(clean))) queueEdit({ contact: { email: clean } })
  }

  function emailLooksWrong() {
    const clean = email.trim()
    return Boolean(clean) && !isValidWaitlistEmail(clean)
  }

  function changeGig(index, patch) {
    const next = gigs.map((gig, itemIndex) => (itemIndex === index ? { ...gig, ...patch } : gig))
    setGigs(next)
    setSavedFor(null)
    if (artist) queueEdit({ gigs: gigsToSave(next) })
  }

  function addGig() {
    if (gigs.length >= VENUE_LIMIT) return
    const next = [...gigs, { key: gigKey(), name: '', date: '' }]
    setGigs(next)
    setSavedFor(null)
  }

  function removeGig(index) {
    const next = gigs.filter((_, itemIndex) => itemIndex !== index)
    setGigs(next)
    setSavedFor(null)
    if (artist) queueEdit({ gigs: gigsToSave(next) })
  }

  function onConsentChange(event) {
    const next = event.target.checked
    setAgreed(next)
    if (next) setConsentError(false)
    setSavedFor(null)
  }

  async function save() {
    if (saving) return
    const emailBad = emailLooksWrong()
    if (emailBad) setEmailError(true)
    if (!agreed) {
      setConsentError(true)
      return
    }
    if (emailBad) return
    const savedGigs = gigsToSave(gigs)
    setGigs(savedGigs.map((gig) => ({ key: gigKey(), ...gig })))
    queueEdit({ gigs: savedGigs })
    flushRef.current()
    setSaving(true)
    setSaveError(false)
    const ok = await submitAssets(artist.id)
    setSaving(false)
    if (!ok) {
      setSaveError(true)
      return
    }
    track('assets_saved', artist.id, {
      media: artist.media.length,
      bioLength: bio.length,
      seconds: Math.min(Math.round((Date.now() - openedAt) / 1000), 2592000),
    })
    track('consent_given', artist.id)
    track('preview_shown', artist.id)
    setSavedFor(artist.id)
    window.scrollTo(0, 0)
  }

  function editAgain() {
    setSavedFor(null)
    window.scrollTo(0, 0)
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

  if (saved) {
    return (
      <div className="upload-page">
        <div className="upload-column">
          {brand}
          <UploadDone artist={artist} token={token} email={email} onEdit={editAgain} />
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
            <div className="field-label">Socials &amp; contact</div>
            <div className="upload-socials">
              <label className="upload-social-row">
                <span className="upload-social-icon" aria-hidden="true">
                  <IconMail size={20} stroke={1.5} />
                </span>
                <input
                  type="email"
                  className="input-bare"
                  aria-label="Email"
                  aria-invalid={emailError}
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  onBlur={() => setEmailError(emailLooksWrong())}
                  placeholder="Email"
                  autoComplete="email"
                  maxLength={120}
                />
              </label>
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
            {emailError && (
              <span className="upload-hint">That email doesn’t look right. Check it or leave it blank.</span>
            )}
          </div>

          <div className="upload-section">
            <UploadLimitsNote />
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*,audio/*"
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
              <span className="dropzone-hint">Drop photos, videos or audio here, or click to browse</span>
            </button>
            <AssetLinks
              links={artist.links}
              onAdd={(link) => {
                if (link?.url) track('links_added', artist.id, { links: (artist.links?.length ?? 0) + 1 })
                addLink(artist.id, link)
                setSavedFor(null)
              }}
              onRemove={(index) => {
                removeLink(artist.id, index)
                setSavedFor(null)
              }}
              buttonLabel="Add link to video or audio"
              hint="YouTube, SoundCloud, Bandcamp, Spotify"
            >
              {artist.media.map((item, index) => (
                item.type === 'audio' ? (
                  <AudioFileRow
                    key={item.url || item.label + index}
                    item={item}
                    index={index}
                    playing={player.playing && player.url === item.url}
                    onPlay={toggleAudio}
                    onRemove={(mediaIndex) => {
                      if (player.url === artist.media[mediaIndex]?.url) stopAudio()
                      removeMedia(artist.id, mediaIndex)
                      setSavedFor(null)
                    }}
                  />
                ) : (
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
                )
              ))}
              {uploads.map((upload) => (
                <li key={upload.key} className={'upload-progress' + (upload.failed ? ' is-failed' : '') + (upload.type === 'audio' ? ' is-audio' : '')}>
                  <span className={'upload-thumb' + (upload.type === 'audio' ? ' is-audio' : '')} aria-hidden="true">
                    <IconUpload size={16} stroke={1.6} />
                  </span>
                  {upload.type === 'audio' ? (
                    <span className="upload-item-copy">
                      <span className="upload-item-name">{upload.name}</span>
                      <span className="upload-item-meta">{upload.failed ? 'Audio' : 'Audio · uploading'}</span>
                    </span>
                  ) : (
                    <span className="upload-item-name">{upload.name}</span>
                  )}
                  {upload.failed ? (
                    <>
                      <span className="upload-progress-text">Upload failed</span>
                      <button
                        type="button"
                        className="upload-remove"
                        onClick={() => dismissUpload(upload.key)}
                        aria-label={`Dismiss ${upload.name}`}
                      >
                        <IconX size={15} stroke={1.6} />
                      </button>
                    </>
                  ) : (
                    <span className="upload-progress-text">{Math.round(upload.progress * 100)}%</span>
                  )}
                  {!upload.failed && (
                    <span className="upload-progress-bar" style={{ width: `${Math.round(upload.progress * 100)}%` }} />
                  )}
                </li>
              ))}
            </AssetLinks>
            {uploadNotice && <p className="upload-hint upload-notice">{uploadNotice}</p>}
          </div>

          <div className="upload-section venue-section">
            <div className="venue-head">
              <div className="field-label">Where you've played</div>
              <div className="venue-count">{gigs.length} of {VENUE_LIMIT}</div>
            </div>
            <p className="venue-help">Venues and dates you've played. Promoters and audiences like to see where you've been.</p>
            <div className="venue-list">
              {gigs.map((gig, index) => (
                <div className="venue-row" key={gig.key}>
                  <input
                    type="text"
                    aria-label={`Venue ${index + 1}`}
                    placeholder="Venue"
                    value={gig.name}
                    maxLength={120}
                    onChange={(event) => changeGig(index, { name: event.target.value })}
                  />
                  <input
                    type="text"
                    aria-label={`Date ${index + 1}`}
                    placeholder="Month and year"
                    value={gig.date}
                    maxLength={40}
                    onChange={(event) => changeGig(index, { date: event.target.value })}
                  />
                  <button
                    type="button"
                    className="venue-remove"
                    aria-label={`Remove venue ${index + 1}`}
                    onClick={() => removeGig(index)}
                  >
                    <IconX size={16} stroke={1.6} />
                  </button>
                </div>
              ))}
            </div>
            <div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={addGig}
                disabled={gigs.length >= VENUE_LIMIT}
              >
                <IconPlus size={16} stroke={1.5} />
                Add another venue
              </button>
            </div>
          </div>

          <div className="upload-section consent-section">
            <div className="field-label">Permission to use your content</div>
            <label className={'consent' + (agreed ? ' is-on' : '') + (consentError ? ' is-error' : '')}>
              <input
                type="checkbox"
                className="sr-only consent-input"
                checked={agreed}
                onChange={onConsentChange}
                aria-invalid={consentError || undefined}
                aria-describedby={consentError ? 'consent-error' : undefined}
              />
              <span className="consent-box" aria-hidden="true">
                {agreed && <IconCheck size={14} stroke={3} />}
              </span>
              <span className="consent-copy">{CONSENT_COPY}</span>
            </label>
            {consentError && (
              <div className="consent-error" id="consent-error" role="alert">
                Tick the box to confirm before sending.
              </div>
            )}
          </div>

          <button
            type="button"
            className={'btn btn-primary btn-submit' + (agreed ? '' : ' is-inactive')}
            onClick={save}
            disabled={uploading || saving}
            aria-disabled={!agreed || uploading || saving}
          >
            {uploading ? 'Uploading…' : saving ? 'Saving…' : 'Save'}
          </button>
          {saveError && (
            <p className="upload-hint" role="alert">
              We couldn’t save that. Check your connection and press Save again.
            </p>
          )}
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
