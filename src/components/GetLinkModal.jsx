import { useState } from 'react'
import { IconBrandInstagram, IconCopy, IconMail, IconPhone, IconX } from '@tabler/icons-react'
import { socialHref, uploadUrl } from '../data/artists'

export default function GetLinkModal({ artist, onClose }) {
  const [copied, setCopied] = useState(false)
  const url = uploadUrl(artist.uploadToken)
  const email = artist.contact?.email?.trim()
  const phone = artist.contact?.phone?.trim()
  const instagram = artist.contact?.instagram?.trim()
  const hasContact = Boolean(email || phone || instagram)

  async function copyLink() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Clipboard may be blocked; Copied still confirms the link was prepared.
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="ad-modal-overlay" onClick={onClose}>
      <div
        className="ad-modal req-modal"
        role="dialog"
        aria-labelledby="get-link-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ad-modal-head">
          <h2 id="get-link-title">Request assets</h2>
          <button type="button" className="ad-modal-close" onClick={onClose} aria-label="Close">
            <IconX size={18} stroke={1.6} />
          </button>
        </div>
        <p className="req-note">
          Send this link to <strong>{artist.name}</strong>. It stays the same, so they can come back any time to add or edit their bio, photos, and videos.
        </p>
        <div className="media-link-box">
          <div className="media-link-url">{url}</div>
          <button type="button" className="btn" onClick={copyLink}>
            <IconCopy size={14} stroke={1.5} />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {hasContact && (
          <div className="get-link-contacts">
            {email && (
              <a className="btn btn-outline" href={`mailto:${email}`}>
                <IconMail size={16} stroke={1.5} />
                {email}
              </a>
            )}
            {phone && (
              <a className="btn btn-outline" href={`tel:${phone.replace(/\s/g, '')}`}>
                <IconPhone size={16} stroke={1.5} />
                {phone}
              </a>
            )}
            {instagram && (
              <a className="btn btn-outline" href={socialHref('instagram', instagram)} target="_blank" rel="noreferrer">
                <IconBrandInstagram size={16} stroke={1.5} />
                {instagram}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
