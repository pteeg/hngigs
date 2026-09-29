/**
 * Scrapes past gig events from Hot Numbers' Eventbrite organiser page.
 * Uses the internal Eventbrite API (no token required for public organisers).
 * Writes output to scripts/seed.json
 *
 * Run with: node scripts/scrape-eventbrite.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ORG_ID = '74278332993'

// Eventbrite's internal API endpoint used by their own frontend
const API = `https://www.eventbrite.co.uk/api/v3/destination/events/?event_ids=&expand=image,primary_venue,ticket_availability,saves,primary_organizer&page_size=50&time_filter=past&organizer.id=${ORG_ID}`

const GIG_KEYWORDS = [
  'live music', 'live @', 'live at', 'discovery sessions',
  'jazz', 'sessions', 'lates', 'dj', 'freedom sound',
  'quartet', 'trio', 'duo', 'band', 'acoustic',
  'all-dayer', 'all dayer', 'in concert', 'feat.', 'ft.',
  '15 years of hot numbers', 'presents',
]

const EXCLUDE_KEYWORDS = [
  'quiz', 'speed dating', 'pottery', 'ceramics',
  'drink & draw', 'film screening', 'poetry',
  'business club', 'foundacure', 'soirée',
  'pizza & pottery', 'hiro ceramics', 'roll on',
  'creative comics', 'drawing evening',
]

const SERIES_PREFIXES = [
  'jazz lates at hot numbers',
  'jazz lates',
  'friday lates at hot numbers',
  'friday lates',
  'hot numbers jazz',
  'hot numbers',
  'live music @ hot numbers gwydir street',
  'live music @ hot numbers',
  'live music at hot numbers',
  'live music',
  'discovery sessions',
  'international jazz day',
  '15 years of hot numbers',
]

function isGig(title) {
  const lower = title.toLowerCase()
  if (EXCLUDE_KEYWORDS.some(k => lower.includes(k))) return false
  if (GIG_KEYWORDS.some(k => lower.includes(k))) return true
  return false
}

function extractArtist(title) {
  let t = title.trim()

  // 1. Try colon split — "Jazz Lates: Artist Name"
  const colonIdx = t.indexOf(':')
  if (colonIdx > -1) {
    const left = t.slice(0, colonIdx).trim().toLowerCase()
    const right = t.slice(colonIdx + 1).trim()
    if (right.length > 1 && SERIES_PREFIXES.some(p => left.includes(p))) {
      t = right
    } else if (right.length > 1) {
      t = right
    }
  } else {
    // 2. Try em-dash / hyphen split — "15 Years of Hot Numbers – Artist"
    const dashMatch = t.match(/^(.+?)\s[–—]\s(.+)$/)
    if (dashMatch) {
      const left = dashMatch[1].trim().toLowerCase()
      const right = dashMatch[2].trim()
      if (SERIES_PREFIXES.some(p => left.includes(p))) {
        t = right
      }
    }

    // 3. "Live Music @ Hot Numbers Gwydir Street - Jess Morgan"
    const atMatch = t.match(/^Live Music\s*[@at]+\s*Hot Numbers[^-–]*[-–]\s*(.+)$/i)
    if (atMatch) {
      t = atMatch[1].trim()
    }
  }

  // Strip trailing date/location suffixes
  t = t.replace(/[-–]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}$/i, '').trim()
  t = t.replace(/\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}$/i, '').trim()
  t = t.replace(/\s*\|.*$/, '').trim()
  t = t.replace(/^[-–,\s]+|[-–,\s]+$/g, '').trim()

  return t.length > 1 ? t : null
}

async function fetchPage(pageNum) {
  const url = `${API}&page=${pageNum}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': `https://www.eventbrite.co.uk/o/hot-numbers-coffee-ltd-${ORG_ID}`,
    }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} on page ${pageNum}`)
  return res.json()
}

;(async () => {
  console.log('Fetching events from Eventbrite internal API...')

  let allEvents = []
  let page = 1

  while (true) {
    console.log(`  Fetching page ${page}...`)
    let data
    try {
      data = await fetchPage(page)
    } catch (e) {
      console.log(`  Stopped at page ${page}: ${e.message}`)
      break
    }

    const events = data.events ?? data.data?.events ?? []
    if (!events.length) break

    allEvents.push(...events)
    console.log(`  Got ${events.length} events (total: ${allEvents.length})`)

    const pagination = data.pagination ?? data.data?.pagination
    if (!pagination || !pagination.has_more_items) break
    page++
  }

  if (!allEvents.length) {
    // Fallback: try the organiser events endpoint
    console.log('\nInternal API returned nothing — trying fallback endpoint...')
    const fallback = await fetch(
      `https://www.eventbriteapi.com/v3/organizers/${ORG_ID}/events/?status=ended&order_by=start_desc&page_size=200`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const fb = await fallback.json()
    allEvents = fb.events ?? []
    console.log(`Fallback returned ${allEvents.length} events`)
  }

  console.log(`\nTotal events fetched: ${allEvents.length}`)

  // Extract title + date from each event
  const parsed = allEvents.map(e => ({
    title: e.name?.text ?? e.name ?? '',
    date: e.start?.local ?? e.start_date ?? '',
    url: e.url ?? '',
  })).filter(e => e.title)

  console.log('\nAll event titles:')
  parsed.forEach((e, i) => console.log(`  ${i + 1}. ${e.title}`))

  // Filter to gigs
  const gigs = parsed.filter(e => isGig(e.title))
  console.log(`\n${gigs.length} identified as gig events:`)
  gigs.forEach(g => console.log(`  → ${g.title}`))

  // Build artist map
  const artistMap = {}
  for (const gig of gigs) {
    const name = extractArtist(gig.title) ?? gig.title
    if (!artistMap[name]) {
      artistMap[name] = {
        name,
        initials: name.split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase(),
        assetStatus: 'none',
        gigs: [],
      }
    }
    artistMap[name].gigs.push({ title: gig.title, date: gig.date, url: gig.url })
  }

  const artists = Object.values(artistMap).sort((a, b) => b.gigs.length - a.gigs.length)

  const output = {
    scrapedAt: new Date().toISOString(),
    totalEventsFound: allEvents.length,
    gigEventsFound: gigs.length,
    artists,
  }

  const outPath = path.join(__dirname, 'seed.json')
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2))

  console.log(`\nDone! ${artists.length} artists written to scripts/seed.json`)
  console.log('Top artists by gig count:')
  artists.slice(0, 15).forEach(a => console.log(`  ${a.name} (${a.gigs.length} gig${a.gigs.length > 1 ? 's' : ''})`))
})()
