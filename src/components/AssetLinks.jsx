import { Children, useState } from 'react'
import { IconLink, IconPlayerPlay, IconX } from '@tabler/icons-react'
import { audioLinkKind, isYoutubeUrl, linkLabel, linkSource, withHttps } from '../data/artists'

export default function AssetLinks({
  links = [],
  onAdd,
  onRemove,
  buttonLabel = 'Add link',
  hint = '',
  extraActions,
  children,
}) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')

  function submit(event) {
    event.preventDefault()
    const href = withHttps(url)
    if (!href) return
    onAdd({ url: href, label: label.trim() })
    setUrl('')
    setLabel('')
    setOpen(false)
  }

  const mediaItems = Children.toArray(children)

  return (
    <div className="asset-links">
      <div className="upload-media-actions">
        {extraActions}
        {!open && (
          <>
            <button type="button" className="btn btn-outline" onClick={() => setOpen(true)}>
              <IconLink size={16} stroke={1.5} />
              {buttonLabel}
            </button>
            {hint && <span className="upload-link-hint">{hint}</span>}
          </>
        )}
      </div>

      {open && (
        <form className="add-link-form" onSubmit={submit}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            autoFocus
          />
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional)"
          />
          <div className="add-link-form-actions">
            <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!url.trim()}>Add</button>
          </div>
        </form>
      )}

      {(links.length > 0 || mediaItems.length > 0) && (
        <ul className="upload-list">
          {links.map((link, index) => {
            const kind = audioLinkKind(link.url)
            const playable = isYoutubeUrl(link.url) || Boolean(kind)
            return (
              <li key={link.url + index}>
                <a className="upload-item-main" href={link.url} target="_blank" rel="noreferrer">
                  <span className={'asset-link-icon' + (playable ? ' is-video' : '')} aria-hidden="true">
                    {playable ? (
                      <IconPlayerPlay size={16} stroke={1.8} />
                    ) : (
                      <IconLink size={16} stroke={1.5} />
                    )}
                  </span>
                  <span className="asset-link-text">
                    <span className="asset-link-label">{linkLabel(link)}</span>
                    <span className="asset-link-url">{kind ? linkSource(link.url) : link.url}</span>
                  </span>
                </a>
                {onRemove && (
                  <button type="button" className="upload-remove" onClick={() => onRemove(index)} aria-label={`Remove ${linkLabel(link)}`}>
                    <IconX size={16} stroke={1.6} />
                  </button>
                )}
              </li>
            )
          })}
          {mediaItems}
        </ul>
      )}
    </div>
  )
}
