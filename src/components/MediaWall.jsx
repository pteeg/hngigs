import { useState } from 'react'
import { IconDownload, IconPlayerPlayFilled } from '@tabler/icons-react'
import { youtubeId } from '../lib/pressKit'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'photo', label: 'Photos' },
  { key: 'video', label: 'Videos' },
]

// Placeholder tiles have no intrinsic size, so vary their shape to keep the wall uneven.
const PLACEHOLDER_RATIOS = ['3 / 4', '1 / 1', '4 / 5', '3 / 5', '4 / 3', '2 / 3']

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return ''
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function PlayBadge() {
  return (
    <span className="pk-play pk-tile-play" aria-hidden="true">
      <IconPlayerPlayFilled size={22} />
    </span>
  )
}

function MediaTile({ item, ratio, onOpen }) {
  const [duration, setDuration] = useState('')
  const isVideo = item.type === 'video'
  const style = item.url ? undefined : { aspectRatio: ratio }

  return (
    <button
      type="button"
      className={'pk-tile' + (isVideo ? ' is-video' : '') + (item.url ? '' : ' is-placeholder')}
      style={style}
      onClick={onOpen}
      aria-label={`${isVideo ? 'Play' : 'View'} ${item.label || (isVideo ? 'video' : 'photo')}`}
    >
      {item.url && !isVideo && <img src={item.url} alt="" loading="lazy" />}
      {item.url && isVideo && (
        <video
          src={item.url}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={(event) => setDuration(formatDuration(event.currentTarget.duration))}
        />
      )}
      {isVideo && <PlayBadge />}
      {duration && <span className="pk-tile-badge">{duration}</span>}
      {!item.url && item.label && <span className="pk-tile-label">{item.label}</span>}
    </button>
  )
}

function YoutubeTile({ link }) {
  const [playing, setPlaying] = useState(false)
  const id = youtubeId(link.url)

  if (playing && id) {
    return (
      <div className="pk-tile is-video is-embed">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={link.label || 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      className="pk-tile is-video is-youtube"
      onClick={() => (id ? setPlaying(true) : window.open(link.url, '_blank', 'noreferrer'))}
      aria-label={`Play ${link.label || 'YouTube video'}`}
    >
      {id && <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />}
      <PlayBadge />
      <span className="pk-tile-badge">YouTube</span>
      {link.label && <span className="pk-tile-label">{link.label}</span>}
    </button>
  )
}

export default function MediaWall({ media, youtubeLinks, onOpen, onDownloadPhotos, downloading }) {
  const [filter, setFilter] = useState('all')
  const wall = media.filter((m) => m.type === 'photo' || m.type === 'video')
  const photoCount = wall.filter((m) => m.type === 'photo').length
  const videoCount = wall.filter((m) => m.type === 'video').length + youtubeLinks.length
  const canDownloadPhotos = Boolean(onDownloadPhotos) && wall.some((m) => m.type === 'photo' && m.url)

  const visible = filter === 'all' ? wall : wall.filter((m) => m.type === filter)
  const showLinks = filter !== 'photo'

  return (
    <section className="pk-wall" aria-label="Photos and videos">
      <div className="pk-wall-bar">
        {photoCount > 0 && videoCount > 0 ? (
          <div className="seg-tabs" role="tablist" aria-label="Filter media">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                className={'seg-tab' + (filter === key ? ' active' : '')}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="pk-label">{photoCount ? 'Photos' : 'Videos'}</div>
        )}
        <div className="pk-wall-meta">
          <span>
            {[photoCount && plural(photoCount, 'photo'), videoCount && plural(videoCount, 'video')]
              .filter(Boolean)
              .join(' · ')}
          </span>
          {canDownloadPhotos && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onDownloadPhotos}
              disabled={downloading}
              title="Hi-res photos (.zip)"
            >
              <IconDownload size={15} stroke={1.8} />
              Download
            </button>
          )}
        </div>
      </div>

      <div className="pk-masonry">
        {visible.map((item, index) => (
          <MediaTile
            key={item.url || `${item.label}-${index}`}
            item={item}
            ratio={PLACEHOLDER_RATIOS[index % PLACEHOLDER_RATIOS.length]}
            onOpen={() => onOpen(visible, index)}
          />
        ))}
        {showLinks && youtubeLinks.map((link) => <YoutubeTile key={link.url} link={link} />)}
      </div>
    </section>
  )
}
