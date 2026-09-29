Put the `design_handoff_press_kit/` folder in the repo root. Then run these two prompts in Cursor Agent mode, **one at a time**, and check the result after each.

---

## Prompt 1: Restyle the whole app to the new design system

Restyle the entire app to the design system in `@design_handoff_press_kit/DESIGN_SYSTEM.md`. The tokens are in `@design_handoff_press_kit/tokens.css`. Visual references are the images in `design_handoff_press_kit/screenshots/` and `design_handoff_press_kit/Artist Assets.dc.html` (open it in a browser). Those HTML files are mocks, so rebuild the look in our code instead of copying their markup.

Constraints:
- Stack: React 19, Vite, react-router-dom 7, `@tabler/icons-react`, plain CSS classes in `src/index.css`. No Tailwind or CSS-in-JS.
- Keep all existing behaviour, routes, data and component APIs. This is a visual change only, apart from the small markup changes the new layouts need, such as the segmented filter tabs and search on `Artists.jsx`.
- Delete the unused Vite starter CSS in `src/App.css`.

Tasks:
1. Replace the `:root` block in `src/index.css` with `tokens.css`, which adds Manrope. Change every hard-coded colour, radius and font size in `index.css` to use the tokens. When this is done, `src/index.css` should contain no hex values outside `:root`.
2. Restyle the app shell and `Sidebar.jsx`: floating white rounded sidebar with the dark active nav item and red count badge.
3. Restyle `Artists.jsx` to match `screenshots/artists-list.png`: header buttons, filter tabs with counts, search pill, rounded list card, received and missing asset chips, and Get Link outline buttons.
4. Restyle `ArtistUpload.jsx` to match `screenshots/artist-upload-page.png`, including the success state.
5. Restyle every modal (`ArtistFormModal`, `GetLinkModal`, `MediaPreviewModal`), `AssetPill`, `AssetLinks` and `Settings.jsx` using the component recipes.
6. Leave `ArtistDetail.jsx`'s layout alone for now, apart from applying the tokens. Prompt 2 replaces it.

Finish with `npm run lint`, then check `/artists`, `/u/l4lb9r2c0h7n` and `/settings` against the screenshots.

---

## Prompt 2: Artist press kit profile (option 1c)

Implement the artist press kit profile described in `@design_handoff_press_kit/README.md`, using the tokens and components from Prompt 1. The visual reference is option **1c** in `design_handoff_press_kit/Artist Profile Options.dc.html` and `screenshots/1c-press-kit-*.png`.

Tasks:
1. Create `src/pages/PressKit.jsx`, which takes a `publicView` prop. Replace the `ArtistDetail` layout at `/artists/:id` with it (staff mode, including the preview bar, Copy share link, Edit and Get Link). Add a public route `/p/:id` in `App.jsx`, outside the sidebar shell.
2. Follow the hide-when-missing rules. Empty sections don't render, and the staff bar lists what's missing.
3. Add `jszip` and create `src/lib/pressKit.js` with `downloadPressKit(artist, { photosOnly })` and `bioMarkdown(artist)` as specified. Wire it to the hero's **Download all** button (with a `Preparing zip…` state) and to the photo grid's **Download hi-res photos** card.
4. Add an optional `tagline` field to the seed data in `src/data/artists.js` and to `ArtistFormModal`.
5. Clicking a photo opens `MediaPreviewModal`. The video card plays uploaded videos, or embeds the first YouTube link from `artist.links`.
6. Make it responsive. Below 900px, the content grid stacks and the hero name scales down with `clamp()`.
7. Remove the now-unused carousel, the share-email modal, and their CSS.

Finish with `npm run lint`, then check `/artists/laura-birch` (complete), `/artists/tomorrows-new-quartet` (empty) and `/p/laura-birch`.
