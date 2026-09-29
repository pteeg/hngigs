import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useArtists } from '../context/ArtistsContext'
import AssetLinks from '../components/AssetLinks'
import MediaPreviewModal from '../components/MediaPreviewModal'
import PressKitView from '../components/PressKitView'
import { uploadUrl } from '../data/artists'
import { MAX_MEDIA, mediaProblem } from '../lib/media'
import { track, trackOncePerSession } from '../lib/track'
import { isValidWaitlistEmail, saveWaitlistAnswer } from '../lib/waitlist'
import {
  IconBrandInstagram,
  IconBrandSpotify,
  IconBrandYoutube,
  IconCheck,
  IconCopy,
  IconEdit,
  IconEye,
  IconGift,
  IconMail,
  IconPhoto,
  IconUpload,
  IconX,
} from '@tabler/icons-react'

const SOCIALS = [
  { key: 'instagram', label: 'Instagram', Icon: IconBrandInstagram, placeholder: '@handle or URL' },
  { key: 'spotify', label: 'Spotify', Icon: IconBrandSpotify, placeholder: 'Spotify artist profile link' },
  { key: 'youtube', label: 'YouTube', Icon: IconBrandYoutube, placeholder: 'YouTube channel link' },
]

const WAITLIST_CHOICES = [
  { key: 'yes', label: 'Yes, put me on the list' },
  { key: 'not_now', label: 'Not now' },
  { key: 'no', label: 'No thanks' },
]

function countFiles(files) {
  const list = Array.from(files)
  const videos = list.filter((file) => file.type.startsWith('video/')).length
  return { photos: list.length - videos, videos }
}

function CopyButton({ text, label, className = 'btn', onCopied }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return
    }
    onCopied?.()
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button type="button" className={className} onClick={copy} aria-live="polite">
      {copied ? <IconCheck size={14} stroke={2} /> : <IconCopy size={14} stroke={1.5} />}
      {copied ? 'Copied' : label}
    </button>
  )
}

function WaitlistQuestion({ onAnswer }) {
  const [answer, setAnswer] = useState(null)
  const [reason, setReason] = useState('')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState(false)

  function submit(event) {
    event.preventDefault()
    if (!answer) return
    const cleanEmail = answer === 'yes' ? email.trim() : ''
    if (cleanEmail && !isValidWaitlistEmail(cleanEmail)) {
      setEmailError(true)
      return
    }
    onAnswer(answer, answer === 'yes' ? '' : reason.trim(), cleanEmail)
  }

  return (
    <form className="upload-waitlist" onSubmit={submit}>
      <p>We’re building a version you can reuse for every venue you play. Want it when it’s ready?</p>
      <div className="upload-choices" role="group" aria-label="Your answer">
        {WAITLIST_CHOICES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={'btn ' + (answer === key ? 'btn-primary' : 'btn-outline')}
            aria-pressed={answer === key}
            onClick={() => setAnswer(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {answer === 'yes' && (
        <label className="upload-section">
          <span className="field-label">Email (optional)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setEmailError(false)
            }}
            placeholder="you@example.com"
            autoComplete="email"
            maxLength={120}
            aria-invalid={emailError}
          />
          <span className="upload-hint">
            {emailError ? 'That email doesn’t look right. Check it or leave it blank.' : 'Only used to tell you when it’s ready.'}
          </span>
        </label>
      )}
      {answer && answer !== 'yes' && (
        <label className="upload-section">
          <span className="field-label">What would make it useful? (optional)</span>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
        </label>
      )}
      {answer && (
        <button type="submit" className="btn btn-primary upload-waitlist-send">
          Send answer
        </button>
      )}
    </form>
  )
}

export default function ArtistUpload() {
  const { token } = useParams()
  const { getArtistByToken, ready, uploadMedia, removeMedia, updateBio, updateContact, addLink, removeLink, submitAssets } = useArtists()
  const artist = getArtistByToken(token)
  const fileRef = useRef(null)
  const [previewIndex, setPreviewIndex] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [savedFor, setSavedFor] = useState(null)
  const saved = Boolean(artist) && savedFor === artist.id
  const [waitlistAnswered, setWaitlistAnswered] = useState(false)
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
  const [uploads, setUploads] = useState([])
  const [uploadNotice, setUploadNotice] = useState('')
  const uploading = uploads.some((upload) => !upload.failed)
  const unsaved = useRef({ artistId: null, bio: null, contact: null, timer: null })

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
  }

  const flushRef = useRef(() => {})
  useEffect(() => {
    flushRef.current = () => {
      const edits = unsaved.current
      window.clearTimeout(edits.timer)
      if (edits.artistId && edits.bio != null) updateBio(edits.artistId, edits.bio)
      if (edits.artistId && edits.contact) updateContact(edits.artistId, edits.contact)
      unsaved.current = { artistId: null, bio: null, contact: null, timer: null }
    }
  }, [updateBio, updateContact])

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
      else problems.push(`${file.name} wasn’t added. You can have up to ${MAX_MEDIA} photos and videos.`)
    }
    setUploadNotice(problems.join(' '))
    if (!accepted.length) return
    track('media_added', artist.id, countFiles(accepted))
    setSavedFor(null)
    for (const file of accepted) {
      const key = `${Date.now()}-${Math.random()}`
      const patch = (change) =>
        setUploads((current) => current.map((upload) => (upload.key === key ? { ...upload, ...change } : upload)))
      setUploads((current) => [...current, { key, name: file.name, progress: 0, failed: false }])
      uploadMedia(artist.id, file, (progress) => patch({ progress }))
        .then(() => setUploads((current) => current.filter((upload) => upload.key !== key)))
        .catch(() => patch({ failed: true }))
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

  function save() {
    if (emailLooksWrong()) {
      setEmailError(true)
      return
    }
    flushRef.current()
    submitAssets(artist.id)
    track('assets_saved', artist.id, {
      media: artist.media.length,
      bioLength: bio.length,
      seconds: Math.min(Math.round((Date.now() - openedAt) / 1000), 2592000),
    })
    track('preview_shown', artist.id)
    setSavedFor(artist.id)
    window.scrollTo(0, 0)
  }

  function onWaitlistAnswer(answer, reason, email) {
    track('waitlist_answered', artist.id, { answer })
    saveWaitlistAnswer(artist.id, answer, reason, email)
    setWaitlistAnswered(true)
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
    const kitUrl = `${window.location.origin}/p/${artist.id}`
    const editUrl = uploadUrl(token)

    return (
      <div className="upload-page">
        <div className="upload-column">
          {brand}
          <section className="upload-card upload-done">
            <div className="upload-done-head">
              <span className="upload-done-icon" aria-hidden="true">
                <IconCheck size={24} stroke={2.2} />
              </span>
              <h1>Thanks, sent to Hot Numbers.</h1>
            </div>
            <button type="button" className="btn btn-outline" onClick={editAgain}>
              <IconEdit size={15} stroke={1.5} />
              Edit again
            </button>
          </section>

          <div className="field-label upload-kit-label">Your press kit</div>
          <PressKitView artist={{ ...artist, contact: { ...artist.contact, email: '' } }} preview />

          <section className="upload-card upload-done">
            <div className="field-label upload-gift-label">
              <IconGift size={14} stroke={1.8} />
              Free gift
            </div>
            <p>
              This is your free press kit page. Add the link to your Instagram bio or Linktree and use it whenever a
              venue or promoter asks for your info. It always shows your latest photos, bio and links.
            </p>
            <div className="media-link-box">
              <div className="media-link-url">{kitUrl}</div>
              <CopyButton
                text={kitUrl}
                label="Copy link"
                onCopied={() => track('gift_link_copied', artist.id)}
              />
            </div>
            <div className="upload-edit-note">
              <span>Keep your private edit link to update this any time</span>
              <CopyButton
                text={editUrl}
                label="Copy"
                className="btn btn-outline"
                onCopied={() => track('private_link_copied', artist.id)}
              />
            </div>
          </section>

          <section className="upload-card upload-done">
            {waitlistAnswered ? (
              <p>Thanks, your answer is recorded.</p>
            ) : (
              <WaitlistQuestion onAnswer={onWaitlistAnswer} />
            )}
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
                if (link?.url) track('links_added', artist.id, { links: (artist.links?.length ?? 0) + 1 })
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
              {uploads.map((upload) => (
                <li key={upload.key} className={'upload-progress' + (upload.failed ? ' is-failed' : '')}>
                  <span className="upload-thumb" aria-hidden="true">
                    <IconUpload size={16} stroke={1.6} />
                  </span>
                  <span className="upload-item-name">{upload.name}</span>
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

          <button type="button" className="btn btn-primary btn-submit" onClick={save} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Save'}
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
