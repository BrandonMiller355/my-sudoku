# Feature Ideas

## Hint Menu Feedback for Ineffective Techniques
- When a solving technique is detected but can't eliminate any candidates, the hint menu should display "Present, not useful" (or similar messaging) instead of showing no option at all
- Helps the user understand that a technique exists in the puzzle but doesn't currently help narrow down candidates
- Better UX than silently omitting the technique from the menu

## Quick Menu on Long Press / Right-Click
- Implement a context menu that appears when long-pressing (mobile) or right-clicking (desktop) on a cell
- Menu should show buttons around the cell with quick actions like:
  - "Highlight conjugate pairs" - highlight related cells in conjugate pair relationships
  - "Reveal candidates" - toggle candidate visibility for that cell
  - "Hint" - show hint specific to this cell, with additional context (e.g., "Part of a W-Wing" if applicable)
- Could extend to show other solving technique indicators for the selected cell
- Creates a faster way to explore the puzzle without opening the main hint modal
