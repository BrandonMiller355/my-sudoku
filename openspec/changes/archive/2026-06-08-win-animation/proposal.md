## Why

Finishing a Sudoku is the emotional peak of the game, but right now it lands flat: the moment the last correct digit goes in, a static "Nice solve!" card simply appears over the board. There is no payoff, no spectacle, nothing that makes the player want to win again. We want to reward completion with an over-the-top, Solitaire-cascade-style celebration that turns the finished grid into a playful reveal — and leaves players grinning.

## What Changes

- On puzzle completion, play a full-screen **win celebration animation** before the existing completion card is shown.
- The animation runs as **nine per-digit waves** (digits 1 → 9 in order):
  - For the current digit, each solved cell holding that digit **enlarges as a whole cell (tile + digit) to fill its 3×3 block** — anchored inside the board so edge cells grow inward — one by one.
  - Once every cell for that digit has enlarged, those cells **burst into a shower of tiny copies of that digit** that fall off the bottom of the screen under gravity.
  - The cells they occupied become **transparent**, progressively **revealing an image hidden behind the grid**.
- A **cute corgi image** (sourced online, royalty-free) sits behind the board and is revealed wave by wave; after the digit-9 wave the full image is exposed and briefly held before the card. One image is chosen at random per win, stays fixed for the whole celebration, and is **preloaded** so the reveal shows the photo (not the fallback gradient).
- The animation is **skippable** at any time (on-screen Skip control plus tap/click/Escape), jumping straight to the fully-revealed image and the completion card.
- After the animation (or skip), the existing completion card ("Nice solve!", New Puzzle / Back to Menu) is shown as a **compact, translucent panel** over the revealed image so the corgi stays visible around and through it (text kept legible with an outline/shadow).
- Respect `prefers-reduced-motion`: users who opt out get the static completion card immediately, as today.

## Capabilities

### New Capabilities
- `win-animation`: The completion-celebration experience — the per-digit enlarge-and-burst choreography, the image reveal behind the grid, the skip behavior, reduced-motion handling, and the hand-off to the existing completion card.

### Modified Capabilities
<!-- No existing capability's requirements change. The completion card is not governed by an existing spec; it is described here only as the post-animation hand-off. -->

## Impact

- **Code**: New self-contained overlay component (e.g. `src/WinAnimation.tsx`) driving a canvas-based timeline; wiring in `src/App.tsx` to trigger it on the `isComplete` false → true transition and to gate the existing completion card ([App.tsx:898](src/App.tsx#L898)) behind animation completion/skip.
- **Assets**: A few royalty-free corgi images added to the project (e.g. `public/win/`), with attribution/license recorded.
- **Styling**: Minor additions to `src/styles.css` and/or component-level classes; no changes to puzzle logic, storage, or game state shape.
- **Dependencies**: None — implemented with the existing React + Canvas 2D stack; no new packages.
- **Performance**: Animation is GPU/canvas-driven and time-boxed; it must stay smooth on mid-range devices and never block interaction with the post-animation card.
