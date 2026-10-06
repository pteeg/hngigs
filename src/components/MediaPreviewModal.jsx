import { useEffect, useRef, useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconPhoto, IconPlayerPlay, IconX } from '@tabler/icons-react'

export default function MediaPreviewModal({ media = [], startIndex = 0, onClose }) {
  const items = media.filter((item) => item.type !== 'audio')
  const count = items.length
  const [index, setIndex] = useState(() => {
    const target = media[startIndex]
    const found = target && target.type !== 'audio' ? items.indexOf(target) : 0
    return Math.min(Math.max(found, 0), Math.max(count - 1, 0))
  })
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef(null)
  const item = items[index]

  useEffect(() => {
    setPlaying(false)
    const video = videoRef.current
    if (video) {
      video.pause()
      video.currentTime = 0
    }
  }, [index])

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') cycle(-1)
      if (event.key === 'ArrowRight') cycle(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function cycle(delta) {
    if (count < 2) return
    setIndex((current) => (current + delta + count) % count)
  }

  function playVideo() {
    const video = videoRef.current
    if (!video) return
    video.play()
    setPlaying(true)
  }

  if (!item) return null

  const isVideo = item.type === 'video'

  return (
    <div
      className="ad-modal-overlay media-preview-overlay"
      onClick={(event) => {
        event.stopPropagation()
        onClose()
      }}
    >
      <div
        className="media-preview"
        role="dialog"
        aria-labelledby="media-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="media-preview-head">
          <div id="media-preview-title" className="media-preview-title">
            <span className="media-preview-kind">{isVideo ? 'Video' : 'Photo'}</span>
            <span>{item.label || (isVideo ? 'Video' : 'Photo')}</span>
            {count > 1 && (
              <span className="media-preview-count">
                {index + 1} / {count}
              </span>
            )}
          </div>
          <button type="button" className="ad-modal-close" onClick={onClose} aria-label="Close preview">
            <IconX size={18} stroke={1.6} />
          </button>
        </div>

        <div className="media-preview-stage">
          {item.url && isVideo ? (
            <>
              <video
                ref={videoRef}
                src={item.url}
                controls={playing}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />
              {!playing && (
                <button type="button" className="media-preview-play" onClick={playVideo} aria-label="Play video">
                  <IconPlayerPlay size={36} stroke={1.6} fill="currentColor" />
                </button>
              )}
            </>
          ) : item.url ? (
            <img src={item.url} alt={item.label || ''} />
          ) : (
            <div className="media-preview-missing">
              {isVideo ? <IconPlayerPlay size={40} stroke={1.4} /> : <IconPhoto size={40} stroke={1.4} />}
              <span>No preview available</span>
            </div>
          )}

          {count > 1 && (
            <>
              <button type="button" className="media-preview-nav is-prev" onClick={() => cycle(-1)} aria-label="Previous">
                <IconChevronLeft size={22} stroke={1.6} />
              </button>
              <button type="button" className="media-preview-nav is-next" onClick={() => cycle(1)} aria-label="Next">
                <IconChevronRight size={22} stroke={1.6} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
