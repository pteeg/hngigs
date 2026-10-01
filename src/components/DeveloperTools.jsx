import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useArtists } from '../context/ArtistsContext'
import { db } from '../lib/firebase'

const ANSWER_LABELS = { yes: 'Yes', not_now: 'Not now', no: 'No thanks' }

const ACTION_LABELS = {
  signed_in: 'Signed in',
  session_started: 'Opened the app',
  signed_out: 'Signed out',
  artist_created: 'Added artist',
  artist_edited: 'Edited artist',
  artist_deleted: 'Deleted artist',
  upload_link_requested: 'Opened Request assets',
  upload_link_copied: 'Copied upload link',
  assets_downloaded: 'Downloaded assets',
  notify_email_added: 'Added notify email',
  notify_email_removed: 'Removed notify email',
  staff_email_added: 'Added staff email',
  staff_email_removed: 'Removed staff email',
}

const LOG_LIMIT = 200

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

function useStaffCollection(name, tsField) {
  const { user } = useAuth()
  const { ready } = useArtists()
  const [docs, setDocs] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user || !ready) return undefined
    return onSnapshot(
      collection(db, name),
      (snap) => {
        setDocs(
          snap.docs.map((item) => {
            const data = item.data({ serverTimestamps: 'estimate' })
            return { ...data, id: item.id, ms: millis(data[tsField]) }
          }),
        )
        setError('')
      },
      (err) => setError(err?.code === 'permission-denied' ? 'This account can’t read developer data.' : 'Couldn’t load developer data.'),
    )
  }, [name, tsField, user, ready])

  return { docs, error }
}

function groupByArtist(docs) {
  const map = new Map()
  docs.forEach((item) => {
    if (!item.artistId) return
    if (!map.has(item.artistId)) map.set(item.artistId, [])
    map.get(item.artistId).push(item)
  })
  return map
}

function pilotRow(artist, events, answers, staff) {
  const byType = (type) => events.filter((e) => e.type === type && e.ms != null).sort((a, b) => a.ms - b.ms)
  const opens = byType('upload_link_opened')
  const saves = byType('assets_saved')
  const views = byType('public_kit_viewed')
  const firstOpen = opens[0]?.ms ?? null
  const firstSave = saves.find((e) => firstOpen == null || e.ms >= firstOpen)?.ms ?? null
  const openSessions = new Set(opens.map((e) => e.sessionId))
  const latestAnswer = [...answers].sort((a, b) => (b.ms ?? 0) - (a.ms ?? 0))[0] ?? null

  return {
    artist,
    firstOpen,
    saved: saves.length > 0 || Boolean(artist.submittedAt),
    toSave: firstOpen != null && firstSave != null ? firstSave - firstOpen : null,
    nudges: staff.filter((s) => s.action === 'upload_link_copied').length,
    returns: Math.max(0, openSessions.size - 1),
    returnsAfterSave: byType('returned_visit').length,
    giftCopies: byType('gift_link_copied').length,
    views: views.length,
    topReferrer: topCount(views.map((e) => e.meta?.referrer || 'direct')),
    answer: latestAnswer,
  }
}

function PilotTable({ artists, ready, events, waitlist, staff }) {
  const rows = useMemo(() => {
    const eventsByArtist = groupByArtist(events)
    const answersByArtist = groupByArtist(waitlist)
    const staffByArtist = groupByArtist(staff)
    return artists
      .map((artist) =>
        pilotRow(
          artist,
          eventsByArtist.get(artist.id) ?? [],
          answersByArtist.get(artist.id) ?? [],
          staffByArtist.get(artist.id) ?? [],
        ),
      )
      .sort((a, b) => {
        if (a.firstOpen != null && b.firstOpen != null) return b.firstOpen - a.firstOpen
        if (a.firstOpen != null || b.firstOpen != null) return a.firstOpen != null ? -1 : 1
        return a.artist.name.localeCompare(b.artist.name)
      })
  }, [artists, events, waitlist, staff])

  return (
    <section className="settings-section">
      <div className="sec-label">Pilot</div>
      <div className="list-card pilot-card">
        <table className="pilot-table">
          <thead>
            <tr>
              <th scope="col">Artist</th>
              <th scope="col">Link opened</th>
              <th scope="col">Saved</th>
              <th scope="col">Open to save</th>
              <th scope="col">Nudges</th>
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
                <td>{row.nudges}</td>
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
      </div>
      <p className="pilot-note">
        Nudges counts how often staff copied the artist’s upload link. Returns counts separate browser sessions that
        opened the upload link after the first.
      </p>
    </section>
  )
}

function InterestedTable({ waitlist, artists }) {
  const names = useMemo(() => new Map(artists.map((artist) => [artist.id, artist.name])), [artists])
  const rows = useMemo(() => {
    const byArtist = new Map()
    waitlist
      .filter((entry) => entry.answer === 'yes' && entry.artistId && entry.ms != null)
      .sort((a, b) => a.ms - b.ms)
      .forEach((entry) => {
        const current = byArtist.get(entry.artistId) ?? { artistId: entry.artistId, first: entry.ms, email: '' }
        if (entry.email) current.email = entry.email
        byArtist.set(entry.artistId, current)
      })
    return [...byArtist.values()].sort((a, b) => b.first - a.first)
  }, [waitlist])

  return (
    <section className="settings-section">
      <div className="sec-label">Interested in a press kit</div>
      <div className="list-card pilot-card">
        <table className="pilot-table">
          <thead>
            <tr>
              <th scope="col">Artist</th>
              <th scope="col">Email</th>
              <th scope="col">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.artistId}>
                <th scope="row">
                  {names.has(row.artistId) ? (
                    <Link to={`/artists/${row.artistId}`}>{names.get(row.artistId)}</Link>
                  ) : (
                    row.artistId
                  )}
                </th>
                <td>
                  {row.email ? <a href={`mailto:${row.email}`}>{row.email}</a> : <span className="pilot-no">No email</span>}
                </td>
                <td className="pilot-nowrap">{formatDate(row.first)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="list-empty">No one has said they’re interested yet.</div>}
      </div>
      <p className="pilot-note">
        Artists who tapped “I’m interested” after saving their upload link. The email is the one they entered on the
        form.
      </p>
    </section>
  )
}

function StaffAccounts({ staff }) {
  const accounts = useMemo(() => {
    const map = new Map()
    staff.forEach((entry) => {
      if (entry.ms == null) return
      const current = map.get(entry.email) ?? { email: entry.email, first: entry.ms, last: entry.ms, signIns: 0, actions: 0 }
      current.first = Math.min(current.first, entry.ms)
      current.last = Math.max(current.last, entry.ms)
      if (entry.action === 'signed_in' || entry.action === 'session_started') current.signIns += 1
      else if (entry.action !== 'signed_out') current.actions += 1
      map.set(entry.email, current)
    })
    return [...map.values()].sort((a, b) => b.last - a.last)
  }, [staff])

  return (
    <section className="settings-section">
      <div className="sec-label">Staff accounts</div>
      <div className="list-card pilot-card">
        <table className="pilot-table">
          <thead>
            <tr>
              <th scope="col">Account</th>
              <th scope="col">First seen</th>
              <th scope="col">Last seen</th>
              <th scope="col">Sessions</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.email}>
                <th scope="row">{account.email}</th>
                <td>{formatDate(account.first)}</td>
                <td>{formatDate(account.last)}</td>
                <td>{account.signIns}</td>
                <td>{account.actions}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {accounts.length === 0 && <div className="list-empty">No staff activity yet.</div>}
      </div>
      <p className="pilot-note">
        Only accounts that have used the app since logging started appear here. Sessions counts sign-ins and each new
        browser session.
      </p>
    </section>
  )
}

function StaffLog({ staff, artists }) {
  const names = useMemo(() => new Map(artists.map((artist) => [artist.id, artist.name])), [artists])
  const entries = useMemo(
    () => staff.filter((entry) => entry.ms != null).sort((a, b) => b.ms - a.ms).slice(0, LOG_LIMIT),
    [staff],
  )

  return (
    <section className="settings-section">
      <div className="sec-label">Staff activity</div>
      <div className="list-card pilot-card">
        <table className="pilot-table">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Account</th>
              <th scope="col">Action</th>
              <th scope="col">Detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="pilot-nowrap">{formatDate(entry.ms)}</td>
                <td>{entry.email}</td>
                <td>{ACTION_LABELS[entry.action] ?? entry.action}</td>
                <td className="pilot-reason">
                  {entry.artistId && names.has(entry.artistId) ? (
                    <Link to={`/artists/${entry.artistId}`}>{names.get(entry.artistId)}</Link>
                  ) : (
                    entry.detail || <span className="pilot-no">–</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && <div className="list-empty">No staff activity yet.</div>}
      </div>
      {staff.length > LOG_LIMIT && <p className="pilot-note">Showing the latest {LOG_LIMIT} entries.</p>}
    </section>
  )
}

export default function DeveloperTools() {
  const { artists, ready } = useArtists()
  const events = useStaffCollection('events', 'ts')
  const waitlist = useStaffCollection('waitlist', 'createdAt')
  const staff = useStaffCollection('staffActivity', 'ts')
  const error = events.error || waitlist.error || staff.error

  return (
    <>
      {error && <p className="pilot-error">{error}</p>}
      <PilotTable artists={artists} ready={ready} events={events.docs} waitlist={waitlist.docs} staff={staff.docs} />
      <InterestedTable waitlist={waitlist.docs} artists={artists} />
      <StaffAccounts staff={staff.docs} />
      <StaffLog staff={staff.docs} artists={artists} />
    </>
  )
}
