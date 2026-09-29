import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useArtists } from '../context/ArtistsContext'
import AssetPill from '../components/AssetPill'
import ArtistFormModal from '../components/ArtistFormModal'
import GetLinkModal from '../components/GetLinkModal'
import { actTypeOf, assetsFromArtist } from '../data/artists'
import { IconChevronRight, IconLink, IconPlus, IconSearch } from '@tabler/icons-react'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'complete', label: 'Complete' },
  { key: 'progress', label: 'In progress' },
  { key: 'awaiting', label: 'Awaiting' },
]

const ACT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'dj', label: 'DJ' },
]

const TINT_COUNT = 5

function artistStatus(artist) {
  const assets = assetsFromArtist(artist)
  if (assets === 'received') return 'complete'
  if (assets === 'partial') return 'progress'
  return 'awaiting'
}

export default function Artists() {
  const { artists, ready, ensureUploadLink } = useArtists()
  const [formOpen, setFormOpen] = useState(false)
  const [request, setRequest] = useState(null)
  const [filter, setFilter] = useState('all')
  const [actFilter, setActFilter] = useState('all')
  const [search, setSearch] = useState('')

  const counts = useMemo(() => {
    const next = { all: artists.length, complete: 0, progress: 0, awaiting: 0 }
    artists.forEach((a) => {
      next[artistStatus(a)] += 1
    })
    return next
  }, [artists])

  const actCounts = useMemo(() => {
    const next = { all: artists.length, live: 0, dj: 0 }
    artists.forEach((artist) => {
      next[actTypeOf(artist)] += 1
    })
    return next
  }, [artists])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return artists
      .map((artist, index) => ({ artist, tint: index % TINT_COUNT }))
      .filter(({ artist }) => filter === 'all' || artistStatus(artist) === filter)
      .filter(({ artist }) => actFilter === 'all' || actTypeOf(artist) === actFilter)
      .filter(({ artist }) => !q || artist.name.toLowerCase().includes(q))
  }, [artists, filter, actFilter, search])

  function requestAssets(event, artist) {
    event.preventDefault()
    event.stopPropagation()
    const linked = ensureUploadLink(artist.id)
    if (linked?.uploadToken) setRequest(linked)
  }

  return (
    <>
      <header className="page-header">
        <div className="page-heading">
          <h1 className="page-title">Artist Assets</h1>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary btn-add" onClick={() => setFormOpen(true)}>
            <span className="btn-add-icon" aria-hidden="true">
              <IconPlus size={14} stroke={2.5} />
            </span>
            Add artist
          </button>
        </div>
      </header>

      <div className="page-content">
        <div className="list-toolbar">
          <div className="list-filters">
            <div className="seg-tabs" role="tablist" aria-label="Filter by assets">
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
                  <span className="seg-count">{counts[key]}</span>
                </button>
              ))}
            </div>
            <div className="seg-tabs" role="tablist" aria-label="Filter by live music or DJ">
              {ACT_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={actFilter === key}
                  className={'seg-tab' + (actFilter === key ? ' active' : '')}
                  onClick={() => setActFilter(key)}
                >
                  {label}
                  <span className="seg-count">{actCounts[key]}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="search-pill">
            <IconSearch size={17} stroke={1.5} aria-hidden="true" />
            <input
              type="text"
              className="input-bare"
              placeholder="Find an artist"
              aria-label="Find an artist"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        <section className="list-card">
          {rows.map(({ artist: a, tint }) => (
            <div className="artist-row" key={a.id}>
              <Link to={`/artists/${a.id}`} className="artist-row-main">
                <div className={`avatar tint-${tint}`}>{a.initials}</div>
                <div className="artist-row-body">
                  <div className="artist-row-text">
                    <div className="row-name">{a.name}</div>
                  </div>
                  <AssetPill artist={a} />
                </div>
              </Link>
              <button type="button" className="btn btn-outline artist-row-link" onClick={(event) => requestAssets(event, a)}>
                <IconLink size={15} stroke={1.5} />
                Request assets
              </button>
              <IconChevronRight className="artist-row-caret" size={16} stroke={1.8} aria-hidden="true" />
            </div>
          ))}
          {rows.length === 0 && <div className="list-empty">{ready ? 'No artists match.' : 'Loading artists…'}</div>}
        </section>
      </div>

      {formOpen && <ArtistFormModal onClose={() => setFormOpen(false)} />}

      {request && <GetLinkModal artist={request} onClose={() => setRequest(null)} />}
    </>
  )
}
