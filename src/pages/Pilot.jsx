import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useArtists } from '../context/ArtistsContext'
import { db } from '../lib/firebase'

const ANSWER_LABELS = { yes: 'Yes', not_now: 'Not now', no: 'No thanks' }

function millis(value) {
  return typeof value?.toMillis === 'function' ? value.toMillis() : null
}

function formatDate(ms) {
  return new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function formatDuration(ms) {
  const minutes = Math.max(0, Math.round(ms / 60000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h`
  return `${Math.round(hours / 24)} d`
}

function topCount(values) {
  const counts = new Map()
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  let top = ''
  let best = 0
  counts.forEach((count, value) => {
    if (count > best) {
      top = value
      best = count
    }
  })
  return top
}

function useStaffCollection(name) {
  const { user } = useAuth()
  const { ready } = useArtists()
  const [docs, setDocs] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user || !ready) return undefined
    return onSnapshot(
      collection(db, name),
      (snap) => {
        setDocs(snap.docs.map((item) => item.data({ serverTimestamps: 'estimate' })))
        setError('')
      },
      (err) => setError(err?.code === 'permission-denied' ? 'This account can’t read pilot data.' : 'Couldn’t load pilot data.'),
    )
  }, [name, user, ready])

  return { docs, error }
}

function pilotRow(artist, events, answers) {
  const byType = (type) => events.filter((e) => e.type === type).sort((a, b) => a.ms - b.ms)
  const opens = byType('upload_link_opened')
  const saves = byType('assets_saved')
  const views = byType('public_kit_viewed')
  const firstOpen = opens[0]?.ms ?? null
  const firstSave = saves.find((e) => firstOpen == null || e.ms >= firstOpen)?.ms ?? null
  const openSessions = new Set(opens.map((e) => e.sessionId))
  const latestAnswer = answers.sort((a, b) => b.ms - a.ms)[0] ?? null

  return {
    artist,
    firstOpen,
    saved: saves.length > 0 || Boolean(artist.submittedAt),
    toSave: firstOpen != null && firstSave != null ? firstSave - firstOpen : null,
    returns: Math.max(0, openSessions.size - 1),
    returnsAfterSave: byType('returned_visit').length,
    giftCopies: byType('gift_link_copied').length,
    views: views.length,
    topReferrer: topCount(views.map((e) => e.meta?.referrer || 'direct')),
    answer: latestAnswer,
  }
}

export default function Pilot() {
  const { artists, ready } = useArtists()
  const events = useStaffCollection('events')
  const waitlist = useStaffCollection('waitlist')

  const rows = useMemo(() => {
    const eventsByArtist = new Map()
    events.docs.forEach((e) => {
      const ms = millis(e.ts)
      if (ms == null) return
      if (!eventsByArtist.has(e.artistId)) eventsByArtist.set(e.artistId, [])
      eventsByArtist.get(e.artistId).push({ ...e, ms })
    })
    const answersByArtist = new Map()
    waitlist.docs.forEach((w) => {
      if (!answersByArtist.has(w.artistId)) answersByArtist.set(w.artistId, [])
      answersByArtist.get(w.artistId).push({ ...w, ms: millis(w.createdAt) ?? 0 })
    })
    return artists
      .map((artist) => pilotRow(artist, eventsByArtist.get(artist.id) ?? [], answersByArtist.get(artist.id) ?? []))
      .sort((a, b) => {
        if (a.firstOpen != null && b.firstOpen != null) return b.firstOpen - a.firstOpen
        if (a.firstOpen != null || b.firstOpen != null) return a.firstOpen != null ? -1 : 1
        return a.artist.name.localeCompare(b.artist.name)
      })
  }, [artists, events.docs, waitlist.docs])

  const error = events.error || waitlist.error

  return (
    <>
      <header className="page-header">
        <div className="page-heading">
          <h1 className="page-title">Pilot</h1>
        </div>
      </header>

      <div className="page-content">
        {error && <p className="pilot-error">{error}</p>}
        <section className="list-card pilot-card">
          <table className="pilot-table">
            <thead>
              <tr>
                <th scope="col">Artist</th>
                <th scope="col">Link opened</th>
                <th scope="col">Saved</th>
                <th scope="col">Open to save</th>
                <th scope="col">Returns</th>
                <th scope="col">Gift link copied</th>
                <th scope="col">Public views</th>
                <th scope="col">Waitlist</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.artist.id}>
                  <th scope="row">
                    <Link to={`/artists/${row.artist.id}`}>{row.artist.name}</Link>
                  </th>
                  <td>
                    {row.firstOpen != null ? (
                      <>
                        Yes
                        <div className="pilot-sub">{formatDate(row.firstOpen)}</div>
                      </>
                    ) : (
                      <span className="pilot-no">No</span>
                    )}
                  </td>
                  <td>{row.saved ? 'Yes' : <span className="pilot-no">No</span>}</td>
                  <td>{row.toSave != null ? formatDuration(row.toSave) : <span className="pilot-no">–</span>}</td>
                  <td>
                    {row.returns}
                    {row.returnsAfterSave > 0 && <div className="pilot-sub">{row.returnsAfterSave} after saving</div>}
                  </td>
                  <td>{row.giftCopies > 0 ? `Yes (${row.giftCopies})` : <span className="pilot-no">No</span>}</td>
                  <td>
                    {row.views}
                    {row.views > 0 && <div className="pilot-sub">{row.topReferrer}</div>}
                  </td>
                  <td>
                    {row.answer ? (
                      <>
                        {ANSWER_LABELS[row.answer.answer] ?? row.answer.answer}
                        {row.answer.reason && <div className="pilot-sub pilot-reason">{row.answer.reason}</div>}
                      </>
                    ) : (
                      <span className="pilot-no">–</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="list-empty">{ready ? 'No artists yet.' : 'Loading…'}</div>}
        </section>
        <p className="pilot-note">
          Returns counts separate browser sessions that opened the upload link after the first. Nudges from staff aren’t
          logged yet, so they aren’t counted here.
        </p>
      </div>
    </>
  )
}
