# Handoff: Artist Press Kit profile (option 1c)

## Overview
A new layout for the artist profile in `hot-numbers-gigs`. The profile becomes a press kit: a large hero photo with the artist's name, the bio, a photo grid, a video, socials, gig history and booking contact. It works in two modes:

- **Staff preview** at `/artists/:id`, replacing the current `ArtistDetail` layout. A dark bar across the top says which sections are hidden and has the share, edit and upload-link actions.
- **Public press kit** at a new route, `/p/:id`, using the same component with no staff bar. It's shareable, needs no login, and sits outside the sidebar shell (like `/u/:token`).

A **Download all** button in the hero downloads every photo and video as a `.zip`, plus the bio as a Markdown file.

## About the design files
`Artist Profile Options.dc.html` is an **HTML design reference**, not production code. Open it in a browser (with `support.js` next to it) and scroll to the option labelled **1c**. Options 1a and 1b are in the file for context only. Don't build them.

Rebuild 1c in the existing stack: React 19 + Vite, react-router-dom 7, `@tabler/icons-react`, plain CSS in `src/index.css` using class names (keep the `ad-` prefix or add `pk-`), and data from `ArtistsContext`. Don't copy the inline styles or the `<sc-if>`/`<sc-for>` template syntax.

## Fidelity
**High fidelity.** Match the colours, type sizes, radii and spacing below. The striped placeholders in the mock stand for real `<img>`/`<video>` elements using `artist.media[].url`.

## Layout (1c)
The design canvas is 1280px wide. In the app, it fills `.main` with a max-width of about 1280px, centred.

Outer container: background `#F4F1EC`, radius 28px, overflow hidden, flex column.

### 1. Staff preview bar (staff mode only)
- Background `#1B1A18`, padding `12px 16px 12px 24px`, flex row, gap 14px, items centred.
- Left: an eye icon (16px, `#A39D93`), then the note text (13px, `#C9C3B9`, flex 1):
  - If sections are missing: `Public preview. {n} section(s) ({list}) stay hidden until received.`
  - If nothing is missing: `Public preview. This is what promoters and press see.`
- Right: a pill button, 36px high, padding `0 16px`, radius 999px, background `#FFFFFF`, text `#1B1A18` at 13px/600, with a link icon and the label `Copy share link`. After clicking, the label reads `Link copied` for 1.8s. It copies `${origin}/p/${artist.id}`.
- Keep the existing **Edit** (opens `ArtistFormModal`) and **Get Link** (opens `GetLinkModal`) actions here as extra pills in the same style. They were not in the mock, but staff still need them.

### 2. Body
Padding 28px, flex column, gap 20px.

**Brand row:** Hot Numbers logo (`/HN logo.png`), 32×32, radius 9px, white background, `object-fit: contain`. Then `Hot Numbers` (13px/700) and `· Artist press kit` (13px, `#8A847A`). Gap 10px.

**Hero:** height 520px, radius 32px, overflow hidden, position relative. Background is the first photo in `media` (`object-fit: cover`). If there are no photos, use `#232220`.
- Add a bottom-to-top dark gradient over the photo so the white text stays readable. Suggested: `linear-gradient(to top, rgba(0,0,0,.55), transparent 55%)`.
- Overlay row: absolute, `left: 40px; right: 40px; bottom: 36px`. Flex, space-between, items aligned to the end, gap 24px.
  - Left column (gap 10px):
    - Tagline: 14px/600, `#C9C3B9`, letter-spacing .02em. For example, "Folk singer-songwriter · Cambridge". The data model has no field for this yet. Add an optional `tagline` string to the artist and hide the line when it's empty.
    - Name: 112px/800, letter-spacing -0.055em, line-height 0.9, `#FFFFFF`. Scale it down on narrow screens (about `clamp(56px, 9vw, 112px)`).
  - Right side: a flex row, gap 8px.
    - One social circle per filled-in contact field (Instagram, Spotify, YouTube): 48×48, radius 999px, background `rgba(255,255,255,0.14)`, a white 20px icon, and a link to `socialHref(...)`.
    - **Download all** button, after the socials: 48px high, padding `0 20px 0 16px`, radius 999px, background `#FFFFFF`, text `#1B1A18` at 14px/600, gap 8px, `white-space: nowrap`, 18px bold download icon (`IconDownload`, stroke 2). Tooltip: `Photos + videos (.zip) and bio (.md)`. While the file builds, the label is `Preparing zip…` and the button is disabled.

**Content grid:** `grid-template-columns: minmax(0,1.6fr) minmax(0,1fr)`, gap 20px, `align-items: start`. Below about 900px, stack into one column.

Left column (flex column, gap 20px):
1. **About card** (only if there is a bio): white, radius 28px, padding 36px, gap 14px.
   - Label `About`: 11px/700, uppercase, letter-spacing .1em, `#A39D93`.
   - Bio text: 24px, line-height 1.45, letter-spacing -0.01em, `#1B1A18`, `text-wrap: pretty`.
2. **Photo grid** (only if there are photos): `grid-template-columns: 2fr 1fr`, two rows of 180px, gap 12px, each tile radius 24px.
   - The first tile spans both rows.
   - Second tile: the next photo.
   - Third tile: a dark download card. Background `#1B1A18`, white text, padding 18px, flex column, space-between. It shows a 22px download icon and "Download / hi-res photos" (15px/700, line-height 1.3). Clicking it downloads a photos-only zip.
   - With only one photo, it takes the large tile and the download card fills the rest of the right column.
   - Clicking a photo opens `MediaPreviewModal`.
3. **Video card** (only if there are videos or YouTube links): white, radius 28px, padding 12px, gap 12px.
   - Player: 16:9, radius 20px. Use a `<video>` for uploaded files, or a YouTube embed / thumbnail for `links`. Over the thumbnail, a white 72px play circle with a filled play icon at 26px.
   - Caption row: padding `4px 12px 8px`, space-between. Title at 16px/700. Source text ("YouTube" or "Uploaded") at 13px, `#8A847A`.

Right column (flex column, gap 20px):
1. **Listen & follow** (only if at least one social): white, radius 28px, padding 28px.
   - Label: same style as `About`, with 12px bottom padding.
   - Rows: padding 12px 0, `border-bottom: 1px solid #F1EDE7`, gap 14px. Each row has a 22px brand icon, the name (15px/700) above the handle (13px, `#8A847A`), and an arrow-up-right icon (16px, `#A39D93`). The whole row is a link.
2. **Played at Hot Numbers** (only if `gigHistory` has entries): background `#1B1A18`, white text, radius 28px, padding 28px, gap 14px.
   - Label: same style, `#A39D93`.
   - Rows: space-between, aligned on the text baseline. Gig name 17px/700, date 13px `#A39D93`.
3. **Booking & press** (only if there is an email): background `#D7322B`, white text, radius 28px, padding 28px, gap 10px.
   - Label: same style, in white.
   - Email: 20px/700, letter-spacing -0.01em, a `mailto:` link.

## Hide-when-missing rules
The public press kit never shows empty states. A section with no data is left out entirely.

The staff bar counts what's missing, in this order: bio, photos, videos, socials, contact. It lists the missing items in lowercase and joins them with commas.

## Download all: behaviour
Add `jszip` (`npm i jszip`) and put the logic in `src/lib/pressKit.js`:

```js
import JSZip from 'jszip'

export function bioMarkdown(artist) { /* see below */ }

export async function downloadPressKit(artist, { photosOnly = false } = {}) {
  const zip = new JSZip()
  const slug = artist.id
  const items = artist.media.filter(m => m.url && (!photosOnly || m.type === 'photo'))
  await Promise.all(items.map(async (m, i) => {
    const blob = await (await fetch(m.url)).blob()          // works for data: and http(s) URLs
    const ext = (blob.type.split('/')[1] || (m.type === 'video' ? 'mp4' : 'jpg')).replace('jpeg', 'jpg')
    zip.folder(m.type === 'video' ? 'videos' : 'photos').file(`${slug}-${String(i + 1).padStart(2, '0')}.${ext}`, blob)
  }))
  if (!photosOnly) zip.file(`${slug}-bio.md`, bioMarkdown(artist))
  const out = await zip.generateAsync({ type: 'blob' })
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(out), download: `${slug}-press-kit.zip` })
  a.click(); URL.revokeObjectURL(a.href)
}
```

Zip contents:

```
laura-birch-press-kit.zip
├── laura-birch-bio.md
├── photos/laura-birch-01.jpg …
└── videos/laura-birch-01.mp4 …
```

The Markdown file (`bioMarkdown`) contains:

```md
# Laura Birch
Folk singer-songwriter · Cambridge

Laura Birch is a Cambridge-based folk singer-songwriter…

## Links
- Instagram: https://instagram.com/laurabirchmusic
- Spotify: …
- YouTube: …
- Live session: https://www.youtube.com/watch?v=…

## Played at Hot Numbers
- 12 Oct 2024 · Discovery Sessions

## Booking & press
laura@laurabirch.co.uk
```

Notes:
- YouTube videos (`artist.links`) can't go in the zip. They are listed under **Links** in the Markdown.
- Media items without a `url` (the seed placeholders) are skipped.
- If a fetch fails, skip that file and still download the rest.
- Hide the Download all button when there are no media files and no bio.
- The old, non-functional **Download** button in `ArtistDetail.jsx` can be removed, or wired to the same function.

## State
- `copied` (boolean, 1.8s flash)
- `downloading` (boolean: disables the button and sets the label to `Preparing zip…`)
- `editOpen`
- `linkRequest`
- `previewItem` (for `MediaPreviewModal`)

Derived values: `photos = media.filter(type === 'photo')`, `videos = media.filter(type === 'video')`, `socials` (the contact fields that are filled in), and `missing[]`.

The current share-by-email modal and the carousel are replaced by this layout. The share link and Download all cover those jobs.

## Routing
In `App.jsx`, next to `/u/:token`:

```jsx
<Route path="/p/:id" element={<PressKit publicView />} />
```

`/artists/:id` renders `<PressKit />` (staff mode). Put the shared markup in `src/pages/PressKit.jsx`, or keep the name `ArtistDetail.jsx`.

## Design tokens
Use `tokens.css` and `DESIGN_SYSTEM.md`, which replace the old `:root` variables. The values used on this page are:

| Token | Hex | Use |
|---|---|---|
| ink | `#1B1A18` | dark cards, staff bar, primary text |
| page | `#F4F1EC` | press kit background (near `--cream`) |
| card | `#FFFFFF` | cards, pills |
| red | `#D7322B` | booking card (existing `--red` is `#e22f2f`, either works) |
| muted | `#8A847A` | secondary text |
| label | `#A39D93` | uppercase labels, icons on dark |
| on-dark | `#C9C3B9` | secondary text on dark |
| divider | `#F1EDE7` | row borders |

- **Radii:** 999 (pills and circles), 32 (hero), 28 (cards and container), 24 (photo tiles), 20 (video), 9 (logo).
- **Type:** the app's system font stack. Sizes used: 112, 24, 20, 17, 16, 15, 14, 13, 11 (labels). Weights 600, 700, 800.
- **Spacing:** 8, 10, 12, 14, 20, 24, 28, 36, 40.

## Icons (Phosphor in the mock → Tabler in the repo)
- eye → `IconEye`
- link → `IconLink`
- download → `IconDownload`
- instagram → `IconBrandInstagram`
- spotify → `IconBrandSpotify`
- youtube → `IconBrandYoutube`
- arrow-up-right → `IconArrowUpRight`
- play → `IconPlayerPlayFilled`

## Files
- `CURSOR_PROMPT.md`: two prompts to run in order. Prompt 1 restyles the whole app. Prompt 2 builds this press kit.
- `DESIGN_SYSTEM.md` + `tokens.css`: the new design system that replaces the current look everywhere.
- `screenshots/`: images of the press kit (1c), the artists list and the upload page.
- `Artist Assets.dc.html`: reference for the list and upload screens.
- `Artist Profile Options.dc.html`: the design. See option **1c**.
- `support.js`: needed to open the design file in a browser.
- `assets/hn-logo.png`: the logo. The repo already has `/public/HN logo.png`.
