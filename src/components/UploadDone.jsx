import { useEffect, useState } from 'react'
import {
  IconArrowUpRight,
  IconBrandInstagram,
  IconBrandSpotify,
  IconBrandYoutube,
  IconCheck,
  IconCopy,
  IconEdit,
  IconHandStop,
  IconLock,
  IconMail,
  IconPlayerPlayFilled,
  IconX,
} from '@tabler/icons-react'
import PressKitView from './PressKitView'
import { uploadUrl } from '../data/artists'
import { track } from '../lib/track'
import { isValidWaitlistEmail, saveWaitlistAnswer } from '../lib/waitlist'

// The kit page is shown as "coming soon" to measure interest, so the preview always looks
// like a complete profile: every social button and a full grid of placeholder tiles.
const PREVIEW_TILES = ['photo', 'video', 'photo', 'photo', 'photo', 'photo']
const SKELETON_MEDIA = ['video', 'photo', 'photo', 'video', 'photo', 'photo'].map((type) => ({ type, url: '' }))

function interestKey(artistId) {
  return `hn-interested-${artistId}`
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

function KitPreviewCard({ artist }) {
  const hero = artist.media.find((item) => item.type === 'photo' && item.url)?.url
  const bio = artist.bio?.trim()

  return (
    <div className="done-kit" aria-hidden="true">
      <div className="done-kit-hero" style={hero ? { backgroundImage: `url("${hero}")` } : undefined}>
        <span className="done-kit-badge">Preview</span>
        <div className="done-kit-hero-row">
          <div className="done-kit-name">{artist.name}</div>
          <div className="done-kit-actions">
            <span className="done-kit-icon"><IconBrandInstagram size={15} stroke={1.6} /></span>
            <span className="done-kit-icon"><IconBrandSpotify size={15} stroke={1.6} /></span>
            <span className="done-kit-icon"><IconBrandYoutube size={15} stroke={1.6} /></span>
            <span className="done-kit-email">
              <IconMail size={14} stroke={1.6} />
              Email
            </span>
          </div>
        </div>
      </div>
      <div className="done-kit-body">
        <p className={'done-kit-bio' + (bio ? '' : ' is-empty')}>{bio || 'Your bio goes here.'}</p>
        <div className="done-kit-tiles">
          {PREVIEW_TILES.map((type, index) => (
            <span key={index} className={'done-kit-tile is-' + type}>
              {type === 'video' && (
                <span className="done-kit-play">
                  <IconPlayerPlayFilled size={14} />
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function FullPreviewModal({ artist, onClose }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="ad-modal-overlay done-preview-overlay" onClick={onClose}>
      <div
        className="done-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Full press kit preview"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="ad-modal-close done-preview-close" onClick={onClose} aria-label="Close preview">
          <IconX size={20} stroke={1.6} />
        </button>
        <PressKitView
          artist={{ ...artist, contact: { ...artist.contact, email: '' }, media: [...artist.media, ...SKELETON_MEDIA] }}
          preview
          allowDownload={false}
        />
      </div>
    </div>
  )
}

export default function UploadDone({ artist, token, email, onEdit }) {
  const [showPreview, setShowPreview] = useState(false)
  const [interested, setInterested] = useState(() => {
    try {
      return window.sessionStorage.getItem(interestKey(artist.id)) === '1'
    } catch {
      return false
    }
  })
  const host = `${window.location.host}/p`

  function onInterested() {
    if (interested) return
    const cleanEmail = [email, artist.contact.email]
      .map((value) => (value || '').trim())
      .find((value) => value && isValidWaitlistEmail(value)) || ''
    track('waitlist_answered', artist.id, { answer: 'yes' })
    saveWaitlistAnswer(artist.id, 'yes', '', cleanEmail)
    try {
      window.sessionStorage.setItem(interestKey(artist.id), '1')
    } catch {
      // Remembering the click is only a convenience for this tab.
    }
    setInterested(true)
  }

  return (
    <>
      <section className="upload-card done-thanks">
        <span className="done-thanks-icon" aria-hidden="true">
          <IconCheck size={20} stroke={2.2} />
        </span>
        <div className="done-thanks-text">
          <h1>Thanks. Sent to Hot Numbers.</h1>
          <p className="only-wide">You can come back to this link to make changes.</p>
        </div>
        <button type="button" className="btn btn-outline done-thanks-edit" onClick={onEdit}>
          <IconEdit size={15} stroke={1.5} className="only-wide" />
          Edit
        </button>
      </section>

      <section className="upload-card done-main">
        <div className="done-intro">
          <span className="done-soon">Coming soon</span>
          <h2>A free press kit page, built from what you just sent</h2>
          <p>
            Your photos, bio and links on one page you can send to any venue
            <span className="only-wide"> or promoter</span>.
          </p>
        </div>

        <div className="done-kit-wrap">
          <KitPreviewCard artist={artist} />
          <button type="button" className="done-full-preview" onClick={() => setShowPreview(true)}>
            See the full preview
            <IconArrowUpRight size={15} stroke={1.8} />
          </button>
        </div>

        <div className="done-interest">
          <button
            type="button"
            className={'btn btn-primary done-interest-btn' + (interested ? ' is-done' : '')}
            onClick={onInterested}
            aria-pressed={interested}
          >
            {interested ? <IconCheck size={18} stroke={2} /> : <IconHandStop size={18} stroke={1.6} />}
            {interested ? 'You’re on the list' : 'I’m interested'}
          </button>
          <span className="done-interest-note only-wide">We’ll let you know when it’s ready.</span>
        </div>

        <div className="done-steps">
          <div className="field-label done-steps-label">How it’ll work</div>
          <ol>
            <li>
              <span className="done-step-n">1</span>
              <div className="done-step-body">
                <h3>Copy your link</h3>
                <div className="done-link" aria-label="Your link will appear here when it’s ready">
                  <IconLock size={14} stroke={1.6} />
                  <span className="done-link-host" aria-hidden="true">{host}</span>
                  <span>/{artist.id}</span>
                </div>
              </div>
            </li>
            <li>
              <span className="done-step-n">2</span>
              <div className="done-step-body">
                <h3>Put it in your Instagram bio</h3>
                <p>
                  Or your Linktree.
                  <span className="only-wide"> Send the same link whenever a venue or promoter asks for your info.</span>
                </p>
              </div>
            </li>
            <li>
              <span className="done-step-n">3</span>
              <div className="done-step-body">
                <h3>Update it any time</h3>
                <p>
                  <span className="only-wide">A private edit link keeps your page current. Changes show up straight away.</span>
                  <span className="only-narrow">With your private edit link.</span>
                </p>
                <CopyButton
                  text={uploadUrl(token)}
                  label="Copy your edit link"
                  className="btn btn-outline done-edit-link"
                  onCopied={() => track('private_link_copied', artist.id)}
                />
              </div>
            </li>
          </ol>
        </div>
      </section>

      {showPreview && <FullPreviewModal artist={artist} onClose={() => setShowPreview(false)} />}
    </>
  )
}
