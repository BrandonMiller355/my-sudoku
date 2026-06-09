## Context

The app is a client-only React 19 + Vite + TypeScript + Tailwind 4 Sudoku game. Game state lives in `App.tsx` as a single `GameState` object; the board is an 81-cell grid rendered from a `useMemo` (`board`) inside a `relative overflow-hidden` wrapper ([App.tsx:865](src/App.tsx#L865)). Completion is detected in `completePuzzle()` ([App.tsx:387](src/App.tsx#L387)), which is reached only from `pushMove` (a correct final entry) and `redo`. When `game.isComplete` flips true, a static "Nice solve!" card renders immediately ([App.tsx:898](src/App.tsx#L898)) and several effects close open modals/highlights.

This change inserts a presentational celebration between "puzzle becomes complete" and "completion card is shown," per the proposal and `specs/win-animation/spec.md`. The chosen choreography (confirmed with the user) is **per-digit waves**: for each digit 1→9, its cells enlarge one by one, then that group bursts into tiny copies of that digit, revealing an image behind the grid.

Constraints: no new dependencies; must not touch puzzle/solver/storage logic; must stay smooth on mid-range devices; must be skippable and respect reduced motion.

## Goals / Non-Goals

**Goals:**
- A self-contained celebration overlay triggered exactly once on the incomplete→complete transition during play.
- Faithful per-digit enlarge → burst → reveal choreography over the real board's footprint.
- Smooth falling-digit particles that exit the bottom of the screen.
- Progressive reveal of corgi image(s) sitting behind the grid; fully revealed at the end.
- Always skippable (button + Escape + tap/click); reduced-motion fallback.
- Clean hand-off to the existing completion card with its existing actions intact.
- Zero impact on game state, persistence, timer, and undo/redo.

**Non-Goals:**
- No replay from the completed-games history or on restore/import.
- No screen-shake / fireworks / audio (the IDEAS.md "extra" flourishes are out of scope for this pass; the reveal is the spectacle).
- No new settings UI (a disable toggle is optional and not required; reduced-motion already provides an opt-out).
- No changes to how completion is detected or recorded.

## Decisions

### Decision 1: Self-contained overlay component, not animating the real board
Introduce `src/WinCelebration.tsx`, rendered by `App` only during the celebration. It receives an immutable snapshot of the solved cells (index → value, and `given` for color matching) and the board's on-screen geometry; it does **not** mutate `game` or animate the real board DOM.

- **Why:** The real board is a memoized grid of 81 buttons with intricate class logic. Driving 81 staggered enlarge animations and thousands of particles through React state would cause re-render storms and fight the existing `board` memo. A decoupled overlay keeps game logic untouched and the animation easy to start/stop/skip.
- **Alternatives considered:**
  - *Animate the real cells via CSS classes/state* — rejected: couples presentation to `GameState`, heavy reconciliation, hard to clean up on skip.
  - *Thousands of DOM particle nodes with CSS keyframes* — rejected: layout/paint cost and GC churn; janky on mid devices; awkward to cancel instantly.

### Decision 2: Single full-viewport canvas for tiles, enlarging digits, and particles
The overlay renders three layers: (a) an image backdrop positioned at the board rect (behind), (b) a full-viewport `<canvas>` (z above the image) that draws board-colored opaque "tiles" with their digit over the image and runs the whole timeline, and (c) DOM chrome (Skip button, optional scrim). Removing a tile = ceasing to draw it, so the image shows through; particles are drawn in viewport coordinates so they can fall past the board to the bottom of the screen.

- **Why:** One Canvas 2D context + one `requestAnimationFrame` loop renders tiles, per-cell scale-up, and all particles with trivial physics (gravity, rotation, fade). It is GPU-friendly, cancels in one line on skip, and needs no extra libraries. Drawing board-colored tiles over the image (rather than fading the real cells) makes the start frame seamless and the reveal a simple "stop drawing this tile."
- **Alternatives considered:**
  - *DOM tiles + canvas particles (hybrid)* — viable but adds a second coordination surface; single canvas is simpler to sequence and skip.
  - *WebGL / a particle library* — overkill; violates the no-new-deps goal.

### Decision 3: Geometry via a board ref + uniform 9×9 split, DPR-aware
`App` passes a ref/measured rect of the grid wrapper. The overlay computes cell size as `rect.width / 9` × `rect.height / 9`, and sizes the canvas to the viewport scaled by `devicePixelRatio` for crisp text. Board rect is recomputed on `resize`.

- **Why:** The real board is hidden during the celebration, so only the very first frame needs to align; a uniform split (ignoring 1–2px internal borders/`p-2` padding) is visually indistinguishable for a uniform field of digits and far simpler than measuring 81 buttons.
- **Trade-off:** Sub-pixel border offsets are not reproduced. Acceptable; can be refined by measuring per-cell rects if ever noticeable.

### Decision 4: Trigger via an explicit one-shot signal from `completePuzzle`
Add `celebration` state to `App`: `'none' | 'playing' | 'done'`. `completePuzzle()` is the single play-time path that flips incomplete→complete, so it sets a `pendingCelebration` ref to `true`. An effect watching `game?.isComplete` starts the celebration when complete **and** the ref is set, then clears the ref.

- **Why:** Restoring or importing an already-complete game calls `setGame` with `isComplete: true` **without** going through `completePuzzle`, so the ref stays false and the celebration does not replay — satisfying the "no replay on restore/import" requirement. The ref also guards against double-fire on unrelated re-renders.
- **Alternatives considered:**
  - *Detect the transition purely with a `wasComplete` ref in an effect* — rejected: the initial restore effect observes `false→true` and would wrongly fire.
  - *Call `setCelebration` directly inside the `setGame` updater* — rejected: updaters should be pure; queuing unrelated state from inside one is fragile.

### Decision 5: Gate the completion card; keep the overlay mounted for the reveal backdrop
The existing completion-card block renders when `game.isComplete && celebration !== 'playing'`. While `'playing'`, render `<WinCelebration>` instead. The overlay accepts a `phase` prop: in `'playing'` it animates and shows the Skip control; on natural end or skip it calls `onFinish()` → `App` sets `celebration='done'`. In `'done'` the overlay keeps rendering only the static, fully-revealed image as a backdrop, with the completion card layered above it. The card is a compact, centered, **translucent** panel (low-opacity background + slight backdrop blur) so the corgi stays visible around and through it; its text uses a high-contrast color with an outline/shadow to stay legible over any photo (and over a plain board in the restore/import case, where there is no backdrop). Reduced motion sends `celebration` straight to `'done'`.

- **Why:** Reusing the existing card preserves its `startNewPuzzle` / back-to-menu handlers. Keeping the overlay mounted in a static `'done'` mode gives the card a corgi backdrop without duplicating image logic. `celebration` resets to `'none'` whenever a new/continued game starts or the player returns to the menu, unmounting the overlay.

### Decision 6: Corgi assets in `public/win/`, one chosen at random, preloaded, with a fallback
Add royalty-free corgi photos under `public/win/`. Asset URLs are built against the Vite base path (`import.meta.env.BASE_URL`) so they resolve under the app's served path (e.g. `/my-sudoku/win/...`), not the site root. `App` — not the overlay — picks one image at random per win and passes it to both the playing and `done` phases, so the same image stays on screen across the playing→done remount (rather than re-rolling). The overlay renders it `object-fit: cover` and **preloads it (via an off-screen `Image`) before starting the reveal**: the board stays fully covered until the image decodes, so bursting cells expose the photo rather than the placeholder. A warm gradient fallback is used only if the image fails to load. Sources and licenses are recorded in `public/win/CREDITS.md`.

- **Why:** `public/` keeps assets out of the bundle graph and trivially addressable. Lifting the choice to `App` and preloading avoids both the mid-celebration image swap and the first-reveal gradient flash. Prefer Unsplash/Pexels (free commercial use, no attribution required) or Wikimedia Commons (CC-BY, credited in `CREDITS.md`).
- **Trade-off:** A large photo adds a short decode wait before the reveal; the covered board hides it, so it reads as a beat of anticipation rather than a stall.

### Decision 7: Timeline as tunable constants
Pacing lives in named constants (`ENLARGE_MS`, `ENLARGE_STAGGER_MS`, `HOLD_MS`, `WAVE_GAP_MS`, `END_HOLD_MS`, `PARTICLES_PER_CELL`, `MAX_PARTICLES`, `GRAVITY`, `PARTICLE_FADE_MS`). After tuning by feel, a full run lands around 12–15s, always skippable; `END_HOLD_MS` lingers on the fully-revealed image (~1.5s) before the card. Particle count is capped with a pool to bound memory/CPU.

- **Why:** Feel is iterative; isolating the numbers makes tuning a one-line change and keeps perf bounded on weaker devices.

## Risks / Trade-offs

- **Asset licensing / availability** → Use no-attribution sources (Unsplash/Pexels) or credit CC-BY in `public/win/CREDITS.md`; ship the emoji/gradient fallback so the feature never hard-depends on a download.
- **Particle/text perf on low-end devices** → Single RAF loop, capped pooled particles, DPR-aware sizing, integrate with `dt`; stop the loop the instant the run ends or is skipped.
- **Double-trigger or trigger on restore/import** → One-shot `pendingCelebration` ref set only inside `completePuzzle`; cleared when consumed.
- **First-frame geometry mismatch** → Uniform 9×9 split over the measured board rect; real board hidden so only frame 1 matters; refine per-cell only if visible.
- **z-index / focus conflicts** → Open modals already close on completion; render the overlay above the board but ensure the completion card and Skip button remain the topmost interactive elements; make Skip keyboard-focusable.
- **Animation overstays its welcome** → Always skippable (button/Escape/tap), reduced-motion opt-out, and time-boxed via constants.
- **Resize/scroll during the run** → Recompute board rect on `resize`; the run is short and this layout rarely scrolls, so this is a minor concern.

## Migration Plan

Purely additive, no data migration:
1. Add corgi assets (+ `CREDITS.md`) under `public/win/`.
2. Add `src/WinCelebration.tsx` (overlay + canvas timeline + particles).
3. Wire `App.tsx`: `celebration` state, `pendingCelebration` ref set in `completePuzzle`, trigger effect, reduced-motion shortcut, gate the completion card, render the overlay, and reset `celebration` on new/continue/menu transitions.
4. Minor `styles.css` additions if needed (scrim, image layer).

Rollback: delete `WinCelebration.tsx` and assets, revert the `App.tsx` wiring; the completion card returns to rendering immediately on `isComplete`. No persisted data is affected.

## Resolved / Open Questions

- **One random image vs. a multi-image collage/grid** — Resolved: one random image per win (fixed for the whole celebration); collage remains a possible future enhancement.
- **Exact pacing constants** — Resolved by feel: a full run is ~12–15s with a ~1.5s end hold on the revealed image; all values live in tunable constants.
- **Optional "celebrate" setting** to disable independently of reduced motion — deferred unless requested.
