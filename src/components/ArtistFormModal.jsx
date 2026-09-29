import { useEffect, useRef, useState } from 'react'
import { useArtists } from '../context/ArtistsContext'
import MediaPreviewModal from './MediaPreviewModal'
import { uploadUrl } from '../data/artists'
import { logStaff } from '../lib/staffLog'
import { IconCopy, IconEye, IconPhoto, IconTrash, IconUpload, IconX } from '@tabler/icons-react'

const EMPTY_CONTACT = {
  email: '',
  phone: '',
  instagram: '',
  spotify: '',
  youtube: '',
}

function formFromArtist(artist) {
  return {
    name: artist?.name ?? '',
    tagline: artist?.tagline ?? '',
    bio: artist?.bio ?? '',
    actType: artist?.actType === 'dj' ? 'dj' : 'live',
    contact: { ...EMPTY_CONTACT, ...artist?.contact },
    media: artist?.media ? [...artist.media] : [],
  }
}

export default function ArtistFormModal({ artist, onClose, onDeleted }) {
  const { saveArtist, deleteArtist } = useArtists()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const editing = Boolean(artist)
  const fileRef = useRef(null)
  const [form, setForm] = useState(() => formFromArtist(artist))
  const [pendingFiles, setPendingFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(null)
  const [created, setCreated] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setForm(formFromArtist(artist))
    setPendingFiles([])
    setPreviewIndex(null)
  }, [artist])

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function setContact(key, value) {
    setForm((current) => ({
      ...current,
      contact: { ...current.contact, [key]: value },
    }))
  }

  function onFiles(event) {
    const files = Array.from(event.target.files ?? [])
    if (files.length) setPendingFiles((current) => [...current, ...files])
    event.target.value = ''
  }

  function removeExisting(index) {
    setForm((current) => ({
      ...current,
      media: current.media.filter((_, i) => i !== index),
    }))
  }

  function removePending(index) {
    setPendingFiles((current) => current.filter((_, i) => i !== index))
  }

  async function onSubmit(event) {
    event.preventDefault()
    if (!form.name.trim() || saving) return
    setSaving(true)
    try {
      const saved = await saveArtist({
        id: artist?.id,
        name: form.name,
        tagline: form.tagline,
        contact: form.contact,
        bio: form.bio,
        actType: form.actType,
        media: form.media,
        files: pendingFiles,
      })
      if (!editing && saved) setCreated(saved)
      else onClose()
    } finally {
      setSaving(false)
    }
  }

  function onDeleteClick() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDeleted?.()
    deleteArtist(artist.id)
  }

  async function copyLink() {
    logStaff('upload_link_copied', { artistId: created.id, detail: created.name })
    try {
      await navigator.clipboard.writeText(uploadUrl(created.uploadToken))
    } catch {
      // Clipboard may be blocked; Copied still confirms the link was prepared.
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const addFilesButton = (
    <button type="button" className="btn btn-outline" onClick={() => fileRef.current?.click()}>
      <IconUpload size={16} stroke={1.5} />
      Add files
    </button>
  )

  if (created) {
    return (
      <div className="ad-modal-overlay" onClick={onClose}>
        <div
          className="ad-modal req-modal"
          role="dialog"
          aria-labelledby="artist-form-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="ad-modal-head">
            <h2 id="artist-form-title">Artist added</h2>
            <button type="button" className="ad-modal-close" onClick={onClose} aria-label="Close">
              <IconX size={18} stroke={1.6} />
            </button>
          </div>
          <p className="req-note">
            Send this link to <strong>{created.name}</strong>. It stays the same, so they can come back any time to add or edit their bio, photos, and videos.
          </p>
          <div className="media-link-box">
            <div className="media-link-url">{uploadUrl(created.uploadToken)}</div>
            <button type="button" className="btn" onClick={copyLink}>
              <IconCopy size={14} stroke={1.5} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="ad-modal-footer">
            <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ad-modal-overlay" onClick={onClose}>
      <form
        className="ad-modal artist-form-modal"
        role="dialog"
        aria-labelledby="artist-form-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div className="ad-modal-head">
          <h2 id="artist-form-title">{editing ? 'Edit artist' : 'Add artist'}</h2>
          <button type="button" className="ad-modal-close" onClick={onClose} aria-label="Close">
            <IconX size={18} stroke={1.6} />
          </button>
        </div>

        <div className="artist-form-field">
          <label className="field-label" htmlFor="artist-form-name">Name</label>
          <input
            id="artist-form-name"
            type="text"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="Artist or act name"
            autoComplete="off"
            autoFocus
            required
          />
        </div>

        <div className="artist-form-field">
          <span className="field-label" id="artist-form-type">Type</span>
          <div className="act-toggle" role="radiogroup" aria-labelledby="artist-form-type">
            <span className={'act-toggle-thumb' + (form.actType === 'dj' ? ' is-dj' : '')} aria-hidden="true" />
            <button
              type="button"
              role="radio"
              aria-checked={form.actType === 'live'}
              className={form.actType === 'live' ? 'active' : ''}
              onClick={() => setField('actType', 'live')}
            >
              Live music
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={form.actType === 'dj'}
              className={form.actType === 'dj' ? 'active' : ''}
              onClick={() => setField('actType', 'dj')}
            >
              DJ
            </button>
          </div>
        </div>

        {editing && (
          <div className="artist-form-field">
            <label className="field-label" htmlFor="artist-form-tagline">Tagline</label>
            <input
              id="artist-form-tagline"
              type="text"
              value={form.tagline}
              onChange={(e) => setField('tagline', e.target.value)}
              placeholder="e.g. Folk singer-songwriter · Cambridge"
              autoComplete="off"
            />
          </div>
        )}

        <div className="artist-form-section-label">Contact &amp; socials</div>
        <div className="artist-form-grid">
          <div className="artist-form-field">
            <label className="field-label" htmlFor="artist-form-email">Email</label>
            <input id="artist-form-email" type="email" value={form.contact.email} onChange={(e) => setContact('email', e.target.value)} placeholder="name@example.com" />
          </div>
          <div className="artist-form-field">
            <label className="field-label" htmlFor="artist-form-phone">Phone</label>
            <input id="artist-form-phone" type="text" value={form.contact.phone} onChange={(e) => setContact('phone', e.target.value)} placeholder="+44 …" />
          </div>
          <div className={'artist-form-field' + (editing ? '' : ' artist-form-span')}>
            <label className="field-label" htmlFor="artist-form-instagram">Instagram</label>
            <input id="artist-form-instagram" type="text" value={form.contact.instagram} onChange={(e) => setContact('instagram', e.target.value)} placeholder="@handle" />
          </div>
          {editing && (
            <>
              <div className="artist-form-field">
                <label className="field-label" htmlFor="artist-form-spotify">Spotify profile link</label>
                <input id="artist-form-spotify" type="text" inputMode="url" value={form.contact.spotify} onChange={(e) => setContact('spotify', e.target.value)} placeholder="https://open.spotify.com/artist/…" />
              </div>
              <div className="artist-form-field artist-form-span">
                <label className="field-label" htmlFor="artist-form-youtube">YouTube channel link</label>
                <input id="artist-form-youtube" type="text" inputMode="url" value={form.contact.youtube} onChange={(e) => setContact('youtube', e.target.value)} placeholder="https://youtube.com/@…" />
              </div>
            </>
          )}
        </div>

        {editing && (
          <>
            <div className="artist-form-section-label">Assets</div>
            <div className="artist-form-field">
              <label className="field-label" htmlFor="artist-form-bio">Bio</label>
              <textarea
                id="artist-form-bio"
                className="upload-bio"
                value={form.bio}
                onChange={(e) => setField('bio', e.target.value)}
                placeholder="A short bio, if you already have one"
                rows={5}
              />
            </div>

            <div className="artist-form-field">
              <div className="field-label">Photos & videos</div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={onFiles}
              />
              {form.media.length === 0 && pendingFiles.length === 0 ? (
                <div className="upload-empty">
                  <IconPhoto size={22} stroke={1.5} />
                  <span>No files yet. Add any assets you already have.</span>
                  {addFilesButton}
                </div>
              ) : (
                <>
                  {addFilesButton}
                  <ul className="upload-list">
                    {form.media.map((item, index) => (
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
                        <button type="button" className="upload-preview" onClick={() => setPreviewIndex(index)}>
                          <IconEye size={14} stroke={1.6} />
                          Preview
                        </button>
                        <button type="button" className="upload-remove" onClick={() => removeExisting(index)} aria-label={`Remove ${item.label}`}>
                          <IconX size={15} stroke={1.6} />
                        </button>
                      </li>
                    ))}
                    {pendingFiles.map((file, index) => (
                      <li key={file.name + index}>
                        <span className="upload-thumb" aria-hidden="true">
                          <IconPhoto size={18} stroke={1.5} />
                        </span>
                        <span className="upload-item-name">{file.name}</span>
                        <button type="button" className="upload-remove" onClick={() => removePending(index)} aria-label={`Remove ${file.name}`}>
                          <IconX size={15} stroke={1.6} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </>
        )}

        <div className="ad-modal-footer">
          {editing && (
            <button
              type="button"
              className={'btn btn-delete' + (confirmDelete ? ' is-confirming' : '')}
              onClick={onDeleteClick}
              onBlur={() => setConfirmDelete(false)}
            >
              <IconTrash size={16} stroke={1.5} />
              {confirmDelete ? 'Click again to delete' : 'Delete artist'}
            </button>
          )}
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!form.name.trim() || saving}>
            {saving ? 'Saving…' : editing ? 'Save' : 'Add artist'}
          </button>
        </div>
      </form>
      {previewIndex != null && (
        <MediaPreviewModal
          media={form.media}
          startIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </div>
  )
}
