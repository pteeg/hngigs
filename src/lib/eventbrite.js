// Eventbrite API integration
// Docs: https://www.eventbrite.com/platform/api
//
// TODO: Set VITE_EVENTBRITE_TOKEN in your .env file
// TODO: Set VITE_EVENTBRITE_ORG_ID to the Hot Numbers organiser ID
//   Find it at: https://www.eventbriteapi.com/v3/users/me/organizations/?token=YOUR_TOKEN

const TOKEN = import.meta.env.VITE_EVENTBRITE_TOKEN
const ORG_ID = import.meta.env.VITE_EVENTBRITE_ORG_ID

// Fetch all upcoming events for the Hot Numbers organiser
export async function fetchUpcomingGigs() {
  const res = await fetch(
    `https://www.eventbriteapi.com/v3/organizations/${ORG_ID}/events/?status=live&order_by=start_asc&token=${TOKEN}`
  )
  const data = await res.json()
  return data.events || []
}

// Fetch all past events (for seeding the artist CRM)
export async function fetchPastGigs() {
  const res = await fetch(
    `https://www.eventbriteapi.com/v3/organizations/${ORG_ID}/events/?status=ended&order_by=start_desc&token=${TOKEN}`
  )
  const data = await res.json()
  return data.events || []
}

// Extract a clean artist name from an event title
// Eventbrite titles are often "Artist Name @ Hot Numbers" or "Live Music: Artist Name"
export function extractArtistName(eventTitle) {
  return eventTitle
    .replace(/ @ Hot Numbers.*$/i, '')
    .replace(/^Live Music:\s*/i, '')
    .replace(/^Live Music @ Hot Numbers.*$/i, '')
    .trim()
}
