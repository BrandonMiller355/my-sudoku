## ADDED Requirements

### Requirement: Win celebration triggers on puzzle completion
The system SHALL play a full-screen win celebration animation when an in-progress puzzle transitions from incomplete to complete during play (the final correct cell is entered). The celebration SHALL begin immediately and SHALL precede the existing completion card. The celebration SHALL play at most once per completion and SHALL NOT replay on re-render, undo/redo churn, or when an already-completed game is restored or imported.

#### Scenario: Completing the last cell starts the celebration
- **WHEN** the player enters the final correct digit that completes the puzzle
- **THEN** the win celebration animation starts over the board area
- **THEN** the static completion card is not shown until the celebration finishes or is skipped

#### Scenario: Completing via redo starts the celebration
- **WHEN** the puzzle becomes complete as the result of a redo action
- **THEN** the win celebration animation starts

#### Scenario: Restored completed game does not replay the celebration
- **WHEN** a puzzle that was already complete is restored from storage or imported
- **THEN** the win celebration does not play
- **THEN** the completion card is shown directly

### Requirement: Per-digit enlarge-and-burst choreography
The celebration SHALL run as sequential waves, one per digit value present on the board, in ascending order from 1 to 9. For the wave of digit `d`, each cell whose solved value is `d` SHALL enlarge one by one — the whole cell (its opaque tile and its digit together, not the digit alone) growing, anchored within the board, until it fills the 3×3 block it belongs to. A cell at a block edge SHALL expand inward (e.g. a top-left cell grows right and down) and SHALL NOT extend past the puzzle's outer edge. Only after every cell in that wave has enlarged SHALL those cells burst. Each bursting cell SHALL emit many tiny copies of digit `d` that fall under gravity and exit the bottom of the screen. Pacing SHALL be driven by named, tunable constants (enlarge duration, per-cell stagger, hold-at-full-size, gap between waves).

#### Scenario: Waves run in ascending digit order
- **WHEN** the celebration plays
- **THEN** the cells containing 1 animate first, then 2, then 3, continuing in order through 9
- **THEN** a digit's wave begins only after the previous digit's wave has burst

#### Scenario: A whole cell enlarges to fill its block before the wave bursts
- **WHEN** the wave for a digit begins
- **THEN** each cell holding that digit grows as a single unit (tile and digit) until it fills its own 3×3 block
- **THEN** a cell at a block edge expands inward and never beyond the board's outer edge
- **THEN** the burst occurs only after every cell in that wave has finished enlarging

#### Scenario: Cells burst into tiny copies of their own digit
- **WHEN** the wave for digit `d` bursts
- **THEN** each affected cell emits multiple small particles that are the glyph for digit `d`
- **THEN** the particles fall downward and leave the bottom of the screen

### Requirement: Progressive image reveal behind the grid
A cute image (a royalty-free corgi photo sourced for this feature) SHALL be positioned behind the puzzle grid and SHALL be hidden by the opaque board at the start of the celebration. As each cell bursts, the area it occupied SHALL become transparent, progressively revealing the image behind it. After the digit-9 wave completes, the image SHALL be fully revealed.

A single image SHALL be chosen at random for each win and SHALL remain the same for the entire celebration, including the static post-celebration backdrop (it SHALL NOT change when handing off from the animation to the completion card). Image asset paths SHALL resolve relative to the app's configured base path.

The chosen image SHALL be loaded before the reveal begins: while it is still loading, the board SHALL remain fully covered and the reveal SHALL NOT start, so that bursting cells expose the photo rather than a placeholder. A warm gradient fallback SHALL be used only if the image fails to load.

The fully-revealed image and the static post-celebration backdrop SHALL cover the entire board footprint edge to edge. Once the reveal is complete, no part of the underlying puzzle grid SHALL be visible.

#### Scenario: Image is hidden when the celebration begins
- **WHEN** the celebration starts
- **THEN** the grid still appears filled with its digits and the image behind it is not yet visible

#### Scenario: Reveal waits for the image to load
- **WHEN** the celebration starts and the chosen image has not finished loading
- **THEN** the board remains fully covered and no cells burst until the image is ready
- **THEN** the first cells to burst expose the photo, not the fallback gradient

#### Scenario: The same image is used throughout the celebration
- **WHEN** the animation finishes and the static backdrop is shown behind the completion card
- **THEN** it shows the same corgi image that was revealed during the animation

#### Scenario: Burst cells expose the image beneath them
- **WHEN** a cell bursts during its digit's wave
- **THEN** the region where that cell was becomes transparent
- **THEN** the corresponding portion of the image behind the grid is revealed

#### Scenario: Image is fully revealed at the end
- **WHEN** the digit-9 wave has burst and all cells have been cleared
- **THEN** the full image is visible in the board area
- **THEN** the celebration holds briefly on the fully-revealed image before the completion card appears

#### Scenario: Backdrop fully covers the board after the reveal
- **WHEN** the celebration has finished and the static image backdrop is shown behind the completion card
- **THEN** the image covers the entire board footprint edge to edge
- **THEN** no part of the puzzle grid is visible behind or below the image

### Requirement: Celebration is skippable
The system SHALL allow the player to skip the celebration at any time while it is playing. A visible Skip control SHALL be available throughout the animation, and skipping SHALL also be triggerable by pressing Escape or by tapping/clicking anywhere on the celebration. Skipping SHALL immediately stop the animation, remove any in-flight particles, reveal the full image, and proceed to the completion card.

#### Scenario: Skip via the on-screen control
- **WHEN** the player activates the Skip control during the celebration
- **THEN** the animation stops immediately
- **THEN** the full image is shown and the completion card is displayed

#### Scenario: Skip via keyboard or tap
- **WHEN** the player presses Escape or taps/clicks the celebration while it is playing
- **THEN** the celebration is skipped to its end state

#### Scenario: No lingering particles after skip
- **WHEN** the celebration is skipped mid-wave
- **THEN** no falling digit particles remain on screen

### Requirement: Hand-off to the completion card
After the celebration finishes naturally (including the brief hold on the fully-revealed image) or is skipped, the system SHALL display the completion card (heading, difficulty and solve-time summary, New Puzzle and Back to Menu actions) over the revealed image. The card SHALL be a compact, centered, translucent panel so the revealed image remains visible around and through it; the card's text SHALL remain legible against the image (e.g. high-contrast text with an outline/shadow). The card's actions SHALL behave exactly as they do today.

#### Scenario: Completion card appears after the celebration
- **WHEN** the celebration finishes its digit-9 wave (and its end hold) or is skipped
- **THEN** the completion card is shown with the difficulty and elapsed-time summary
- **THEN** the revealed image remains visible around and through the translucent card
- **THEN** the card's heading, summary, and actions stay legible over the image

#### Scenario: Completion card actions still work
- **WHEN** the player chooses New Puzzle from the post-celebration card
- **THEN** a new puzzle of the same difficulty starts
- **WHEN** the player chooses Back to Menu
- **THEN** the main menu is shown

### Requirement: Reduced-motion fallback
The system SHALL respect the user's `prefers-reduced-motion` setting. When reduced motion is preferred, the system SHALL NOT play the enlarge/burst/particle animation and SHALL instead show the completion outcome immediately, equivalent to the skipped end state.

#### Scenario: Reduced motion shows the static result
- **WHEN** the player completes a puzzle and their system prefers reduced motion
- **THEN** the falling-digit animation does not play
- **THEN** the completion card is shown immediately

### Requirement: Celebration does not alter game state or persistence
The celebration SHALL be purely presentational. It SHALL NOT modify the solved grid, the saved active/completed game records, the timer, or undo/redo history, and the puzzle SHALL already be recorded as completed when the celebration begins.

#### Scenario: Solve is recorded regardless of celebration
- **WHEN** a puzzle is completed and the celebration plays
- **THEN** the completed game is saved to history just as it is without the celebration
- **WHEN** the celebration is skipped
- **THEN** the saved completion record is unchanged
