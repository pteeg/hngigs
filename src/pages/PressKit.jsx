import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useArtists } from '../context/ArtistsContext'
import ArtistFormModal from '../components/ArtistFormModal'
import GetLinkModal from '../components/GetLinkModal'
import PressKitView from '../components/PressKitView'
import { logStaff } from '../lib/staffLog'
import { referrerHost, track } from '../lib/track'
import { IconArrowLeft, IconEdit, IconLink } from '@tabler/icons-react'

export default function PressKit({ publicView = false }) {
  const { id } = useParams()
  const { getArtist, ensureUploadLink, ready } = useArtists()
  const artist = getArtist(id)
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [linkRequest, setLinkRequest] = useState(null)
  const loggedView = useRef('')

  useEffect(() => {
    if (!publicView || !artist || loggedView.current === artist.id) return
    loggedView.current = artist.id
    track('public_kit_viewed', artist.id, { referrer: referrerHost() })
  }, [publicView, artist])

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

  function openGetLink() {
    const next = ensureUploadLink(artist.id)
    if (next?.uploadToken) setLinkRequest(next)
  }

  const staffActions = !publicView && (
    <>
      <button type="button" className="pk-hero-btn" onClick={() => setEditOpen(true)}>
        <IconEdit size={15} stroke={1.5} />
        Edit
      </button>
      <button type="button" className="pk-hero-btn" onClick={openGetLink}>
        <IconLink size={15} stroke={1.5} />
        Request assets
      </button>
    </>
  )

  return (
    <div className={publicView ? 'pk-public' : 'pk-staff'} data-artist-id={artist.id}>
      {!publicView && <BackLink />}
      <PressKitView
        artist={artist}
        publicView={publicView}
        staffActions={staffActions}
        onDownload={publicView ? undefined : (kind) => {
          track('staff_asset_downloaded', artist.id, { kind })
          logStaff('assets_downloaded', { artistId: artist.id, detail: kind === 'photos' ? 'Photos' : 'Full press kit' })
        }}
      />

      {editOpen && (
        <ArtistFormModal
          artist={artist}
          onClose={() => setEditOpen(false)}
          onDeleted={() => navigate('/artists', { replace: true })}
        />
      )}
      {linkRequest && <GetLinkModal artist={linkRequest} onClose={() => setLinkRequest(null)} />}
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
