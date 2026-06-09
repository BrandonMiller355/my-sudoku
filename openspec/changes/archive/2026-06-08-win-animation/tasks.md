## 1. Corgi assets

- [x] 1.1 Source 3–4 royalty-free corgi images (Unsplash/Pexels for no-attribution, or Wikimedia CC-BY) and add them under `public/win/` (e.g. `corgi-1.jpg` … `corgi-4.jpg`), sized/compressed for web.
- [x] 1.2 Record each image's source URL and license in `public/win/CREDITS.md`.
- [x] 1.3 Add a no-network fallback constant in the overlay (warm gradient tiled with 🐶/🐕) used when no image asset is available, so the reveal still reads.

## 2. WinCelebration component scaffold

- [x] 2.1 Create `src/WinCelebration.tsx` exporting a component with props: solved cells snapshot (`{ index, value, given }[]`), board rect/geometry, `phase: 'playing' | 'done'`, and `onFinish()`.
- [x] 2.2 Render the layer stack: image backdrop (`<img>`/background, `object-fit: cover`) positioned at the board rect, a full-viewport `<canvas>` above it, an optional subtle scrim, and a focusable Skip button.
- [x] 2.3 Pick one corgi image at random per mount (fall back to 2.1.3 if unavailable).
- [x] 2.4 Size the canvas to the viewport × `devicePixelRatio`; compute cell size as `rect/9`; recompute geometry on `resize`.

## 3. Tiles + enlarge phase

- [x] 3.1 Draw 81 opaque "tiles" on the canvas at board-local coordinates using the board background color (white / slate-900 by theme) so the start frame matches the real board.
- [x] 3.2 Draw each tile's digit centered, matching the board's given vs. user-entry color for seamlessness.
- [x] 3.3 Build the per-digit wave timeline (digits 1→9): within a wave, enlarge each matching cell one by one (staggered) until its glyph fills the cell; begin the burst only after every cell in the wave has finished enlarging.
- [x] 3.4 Extract pacing into named constants (`ENLARGE_MS`, `ENLARGE_STAGGER_MS`, `WAVE_GAP_MS`, etc.); drive the loop with `requestAnimationFrame` and `dt`.

## 4. Burst, particles, and reveal

- [x] 4.1 On a cell's burst, stop drawing its tile so the image shows through that region (progressive reveal).
- [x] 4.2 Spawn `PARTICLES_PER_CELL` tiny copies of that cell's digit from its center, each with randomized outward velocity, gravity, rotation, and fade.
- [x] 4.3 Update particles per frame (viewport coordinates) and retire them once off the bottom of the screen or fully faded; cap total via `MAX_PARTICLES` with pooling.
- [x] 4.4 After the digit-9 wave bursts and all particles have left, call `onFinish()` (the image is now fully revealed).

## 5. Skip and reduced motion

- [x] 5.1 Implement skip: Skip button click, Escape key, and tap/click anywhere on the overlay all immediately stop the RAF loop, clear particles, draw the fully-revealed image, and call `onFinish()`.
- [x] 5.2 Ensure no falling-digit particles remain after a mid-wave skip.
- [x] 5.3 Cancel the RAF loop and remove listeners on unmount; in `phase: 'done'` render only the static fully-revealed image (no canvas loop, no Skip).

## 6. App.tsx wiring and hand-off

- [x] 6.1 Add `celebration` state (`'none' | 'playing' | 'done'`) and a `pendingCelebration` ref to `App`.
- [x] 6.2 Set `pendingCelebration.current = true` inside `completePuzzle()` (the only play-time completion path).
- [x] 6.3 Add an effect on `game?.isComplete` that, when complete and the ref is set, starts the celebration (`'playing'`) and clears the ref; if `prefers-reduced-motion` is set, go straight to `'done'` instead.
- [x] 6.4 Capture/measure the board grid wrapper rect (ref) to pass into the overlay.
- [x] 6.5 Gate the existing completion card to render only when `game.isComplete && celebration !== 'playing'`; render `<WinCelebration phase="playing" …>` while `'playing'` and keep it mounted as `phase="done"` (static image backdrop) behind the card when `'done'`.
- [x] 6.6 Reset `celebration` to `'none'` on new puzzle, continue/import, and back-to-menu transitions so the overlay unmounts and never replays on restore.
- [x] 6.7 Confirm the celebration does not run on restored/imported already-complete games (ref stays false).

## 7. Verification

- [x] 7.1 `npm run build` passes (tsc + vite) with no type errors.
- [x] 7.2 Manually complete a puzzle: per-digit waves run 1→9, each enlarges then bursts into tiny copies of that digit that fall off-screen, and corgi(s) are progressively then fully revealed. (Verified via headless Chrome: digit-1 wave enlarges first on the start frame, waves burst into falling-digit particles, corgi progressively revealed and fully exposed by ~8s.)
- [x] 7.3 Verify Skip (button, Escape, tap) jumps to the full reveal + completion card with no lingering particles, and that the card's New Puzzle / Back to Menu actions work. (Verified: Skip mid-run removes the canvas immediately — no lingering particles — and shows the completion card.)
- [x] 7.4 Verify reduced-motion shows the completion result immediately with no animation, and that completed-game history is recorded identically with and without the celebration. (Verified with `prefers-reduced-motion: reduce` emulation: no canvas/Skip ever mounts; the completion card appears immediately. History is recorded in `completePuzzle()` independent of the celebration path.)

## 8. Post-review refinements

- [x] 8.1 Enlarge the whole cell (tile + digit), not just the glyph, growing it — anchored inside the board — to fill its own 3×3 block (edge cells expand inward, never past the puzzle edge).
- [x] 8.2 Fix the corgi image path to resolve against the Vite base URL (`import.meta.env.BASE_URL`) instead of the site root, so assets load under `/my-sudoku/`.
- [x] 8.3 Pick the corgi image once in `App` and pass it to both phases so the same image persists across the playing→done hand-off (no re-roll).
- [x] 8.4 Preload the chosen image and keep the board fully covered until it decodes, so the first reveal shows the photo rather than the fallback gradient.
- [x] 8.5 Add `END_HOLD_MS` (~1.5s) to linger on the fully-revealed image before showing the completion card.
- [x] 8.6 Make the completion card a compact, centered, translucent panel with outlined high-contrast text so the corgi stays visible around/through it while the text remains legible.
- [x] 8.7 Slow the overall pacing (longer enlarge/stagger/hold/wave-gap) for a more savorable run.
- [x] 8.8 Make the static `done` backdrop cover the whole board (wrap the image in an `inset-2` box and fill it with `object-cover`); a bare absolutely-positioned `<img>` kept its intrinsic aspect ratio and left the bottom rows of the puzzle exposed.
