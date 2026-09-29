# Hot Numbers Gigs design system (restyle spec)

The current app uses the old look: system font, `--cream #f0ebe0`, square cards and thin borders. This spec replaces it throughout the app. The new look has warm beige backgrounds, big rounded white cards, dark pill buttons, Manrope type, and Hot Numbers red used sparingly as the accent.

Reference files:
- `Artist Assets.dc.html`. Open it in a browser and use the switcher at the bottom to see the artist list, the old profile page, and the artist upload page.
- `screenshots/` has images of each screen.
- `tokens.css` has every token as a CSS variable.

## Principles
1. **Cards, not borders.** Group content in white cards with radius 28 on a `--bg-app` background. Don't use 1px card borders. Use only `--shadow-card`.
2. **Everything interactive is a pill.** Buttons, tabs, chips, search fields and badges all use radius 999.
3. **One dark element per group.** The primary button, the active tab, the active nav item and feature cards use `--ink`. Secondary buttons are white, or white with a 1px `--line` outline.
4. **Red is an accent, not a fill.** Use it for count badges, the round "+" in *Add artist*, the upload icon circle, the booking card and the `gigin.` dot. There's never more than one large red area on screen.
5. **Uppercase micro-labels** head every section: 11px, weight 700, letter-spacing .1em, `--label` colour.
6. **Missing items are dashed.** A missing asset is a dashed `--line-dash` chip. A received one is a solid `--ok-tint` chip with a check.

## Type (Manrope)
| Role | Size / weight / tracking / line-height |
|---|---|
| Press kit name | 112 / 800 / -0.055em / 0.9 |
| Page title (h1) | 40 / 700 / -0.035em / 1.05 |
| Form title | 36 / 700 / -0.035em / 1.1 |
| Press kit bio | 24 / 400 / -0.01em / 1.45 |
| Card title / gig name | 17 / 700 |
| Row name | 15 / 600 / -0.01em |
| Body / buttons | 14 / 600 (buttons), 15 / 400 / 1.6 (paragraphs) |
| Meta | 13 / 400, `--muted` |
| Section label | 11 / 700 / .1em uppercase, `--label` |

## Components
**Sidebar**
- White, width 248, radius 24, padding `20px 14px`, gap 22. It floats with a 16px inset from the viewport, `position: sticky`, height `calc(100vh - 32px)`.
- Logo: 40×40 with radius 12. Beside it, "Hot Numbers Gigs" (15/700) and "powered by **gigin**" (12, `--muted`, with a red dot).
- Search: height 42, `--bg-soft`, radius 14, with a `⌘K` key chip (white, radius 6).
- Nav item: height 44, radius 14, gap 12, 18px icon. Active: `--ink` background, white text, and a red count badge (radius 999, 12/700). Inactive: `--text-2`, hover background `--bg-soft`.

**App shell**
- `display: flex; gap: 16px; padding: 16px`.
- Main area: padding `20px 24px 96px`, content max-width 1120, gap 28 between blocks.

**Buttons**
| Variant | Style |
|---|---|
| Primary | height 46 (44 in headers), padding `0 20px`, `--ink` background, white 14/600, hover `--ink-hover` |
| Primary with red icon | same, but left padding 8 and a 30px red circle holding a bold "+" |
| Secondary | white background, `--shadow-btn`, hover `--bg-hover` |
| Outline | white, 1px `--line` border, height 36, 13/600, hover `border-color: --ink` |
| Soft | `--bg-soft` background (e.g. "Edit my assets") |
| Large submit | height 56, full width, `--ink`, with a trailing arrow |

Gap between icon and label is 8. Icons are 16–17px.

**Segmented tabs**
- Container: white, radius 999, padding 4, gap 4.
- Tab: height 36, padding `0 14px`, 13/600.
- Active tab: `--ink` background, white text. Its count sits in `rgba(255,255,255,.16)`.
- Inactive tab: `--text-2`, count in `--count-bg`, hover `--bg-soft`.

**Search field:** height 44, white, radius 999, padding `0 16px`, 17px magnifier icon, borderless input.

**List card and rows**
- Card: white, radius 28, padding 10.
- Row: padding `12px 14px`, radius 18, gap 16, hover `--bg-hover`, and a caret-right (`#B5AEA3`) on the right.
- Avatar: 46px circle with tinted initials (14/700). Use `--red-tint` / `--red-ink` or other warm tints.

**Asset chips** (height 30, or 28 in headers; padding `0 12px`; 13/600)
- Received: `--ok-tint` background, `--ok-ink` text, bold 12px check.
- Missing: 1px dashed `--line-dash` border, `#9A948A` text.
- Awaiting everything: `--chip-idle` background, `--muted` text, dashed-circle icon.

**Dark media card:** `--ink` background, radius 28, padding 10. The media inside has radius 20. Badges on top use `rgba(255,255,255,.12)` pills at 11/700 uppercase. Arrows are 42px circles in `rgba(255,255,255,.12)`.

**Inputs**
- Background `--bg-soft`, 1px transparent border, radius 16 (18 for textareas), height 52, padding `0 16px`, 15px text.
- On focus: white background and `border-color: --ink`.
- Social inputs start with a 20px brand icon in `--text-2`.

**Dropzone:** 1.5px dashed `--line-dash`, `--bg-subtle`, radius 20, padding 32. A 44px red circle holds an upload icon. Hover: border `--ink`.

**File row:** `--bg-hover`, radius 16, a 48px thumbnail (radius 12), a white *Preview* pill and a round × button.

**Modals** (not in the mocks, so apply the system)
- Overlay: `rgba(27,26,24,.4)`.
- Panel: white, radius 28, padding 28, max-width 520, gap 20.
- Title: 22/700 with -0.02em tracking.
- Close button: 36px circle, hover `--bg-soft`.
- Footer buttons: the pill variants above.
- Form fields: the input style above.

**Empty states:** 1.5px dashed `--line-dash`, radius 18–24, padding 20. A 22px `--label` icon, a 13px `--muted` sentence, and one outline button.

## Icons
Keep `@tabler/icons-react` at `stroke={1.5}` (1.8 for arrows). Size is 16–18 in buttons and nav, 20–22 in cards.

## Screen-by-screen mapping
| Repo file | Target design |
|---|---|
| `components/Sidebar.jsx` | Sidebar spec (`screenshots/artists-list.png`) |
| `pages/Artists.jsx` | Title and count sub-line, *Generate Asset Link* (secondary) and *Add artist* (primary with red icon), segmented filter tabs (All / Complete / In progress / Awaiting, with counts), search pill, list card with rows and asset chips, and a *Get Link* outline button per row |
| `pages/ArtistDetail.jsx` | Press kit 1c. See `README.md`. |
| `pages/ArtistUpload.jsx` | `screenshots/artist-upload-page.png`. Centred column, max 640. Brand row, then a white card (radius 32, padding 40, gap 32) with the form title, lead paragraph, Bio textarea, Socials inputs, Photos & Videos dropzone, *Add link to video* outline button, file rows, and a large submit ("Send to Hot Numbers →"). Success state: 52px `--ok-tint` check circle, "Thanks, {first name}.", and a soft *Edit my assets* button. |
| `pages/Settings.jsx` | Use the same cards, labels and inputs. There's no mock. |
| `components/*Modal.jsx` | Modal spec above |
| `components/AssetPill.jsx` | Asset chips |
| `components/AssetLinks.jsx` | File-row style, with a 40px `--ink` play circle for video links |
