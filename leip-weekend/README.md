# Combination Check

A small static web page for a real-life game: contestants pick 3 options and check whether they've found one of the valid combinations. Correct combinations lock those options so they can't be re-selected.

Everything runs in the browser — no server, no build step, no syncing between devices.

## Files

```
index.html   — page structure
style.css    — visual styling
script.js    — selection/checking logic, localStorage persistence
data.js      — the only file you need to edit for a new game
```

## Editing the game content

Open `data.js`. The `window.GAME_DATA` object looks like this:

```javascript
window.GAME_DATA = {
  title: "Combination Check",
  subtitle: "Select three. Confirm the code.",
  combos: [
    [
      { id: "copper-key", label: "Copper Key" },
      { id: "iron-gear", label: "Iron Gear" },
      { id: "brass-pin", label: "Brass Pin" }
    ]
  ],

  // Optional — defaults shown if omitted
  timer: {
    durationSeconds: 600   // 10:00 countdown
  },
  scoring: {
    pointsPerMinuteRemaining: 1,
    wrongGuessPenalty: 2,
    correctGuessBase: 2
  },
  lockIn: {
    minCorrectCombos: 1   // correct combos needed before Lock it in appears
  }
};
```

When testing locally you can double-click `index.html` — no server needed.

- **`combos`** — a list of winning sets. Each entry is exactly 3 options; every option across all combos becomes a selectable tile (tiles are shuffled, so order inside a set doesn't matter). `id` must be unique (letters, numbers, dashes — no spaces) and is what saved progress refers to. `label` is what contestants see.
- **`title` / `subtitle`** — optional; shown at the top of the page.
- **`timer.durationSeconds`** — optional; countdown length in seconds (default `600`, i.e. 10:00). The timer starts when the game is first opened on a device and persists across refreshes.
- **`scoring.pointsPerMinuteRemaining`** — optional; points added per whole minute left on the clock when scoring (default `1`).
- **`scoring.wrongGuessPenalty`** — optional; points subtracted per incorrect check (default `2`).
- **`scoring.correctGuessBase`** — optional; base value for correct guesses; the nth solve earns `base × n`, so three solves with base `2` contribute `2 + 4 + 6 = 12` (default `2`).
- **`lockIn.minCorrectCombos`** — optional; minimum number of correct combinations a player must find before **Lock it in** becomes available (default `1`).

You can have as many combos as you like. Add, remove, or rename entries and save the file — no code changes needed.

## How it behaves

- Contestants tap up to 3 options; tapping a 4th while 3 are already selected does nothing (with a small nudge to remove one first).
- **Check combination** compares the 3 selected IDs against `combos`.
- On a correct combination: all 3 options gray out permanently (for that device) and a dot in the progress row lights up.
- On an incorrect combination: an error message shows and the selection clears so they can try again.
- A **countdown timer** runs from when the game is first opened. It persists across refreshes and displays as `H.MM.SS` (hours.minutes.seconds) at the top of the page.
- A live **score** updates every second and after each check. It combines time remaining (whole minutes × `pointsPerMinuteRemaining`), compounding correct-guess bonuses (order matters), and flat wrong-guess penalties. Score can go negative.
- **Lock it in** (footer) ends the game early and freezes the timer and score at their current values — useful when all desired combos are found but time is still ticking down. The button stays hidden until the player has found at least `lockIn.minCorrectCombos` combinations.
- When every valid combination has been found, the game **locks in automatically** (no confirmation prompt).
- When the timer hits zero, the game ends automatically: selections are cleared, checking is disabled, and unsolved options gray out with a distinct "expired" style (solved options keep their checkmark styling).
- **If an option appears in more than one valid combo**, solving one of them grays that option out everywhere — it won't be selectable for the other combo either. Worth checking your combos don't unintentionally overlap if you want every combo to stay independently solvable.
- Progress is saved in the browser's `localStorage`, so a refresh doesn't lose it. Option tile order is shuffled once per game session and kept consistent across refreshes; **Reset progress** shuffles a new order.
- **Reset progress** (bottom of the page) clears saved progress on that device after a confirmation prompt. Useful between test runs or game sessions.

## Customizing the look

Colors, fonts, and spacing are all defined as CSS variables at the top of `style.css`:

```css
:root {
  --bg: #14171f;
  --brass: #c6a15b;
  --ink: #edeae0;
  ...
}
```

Change those values to reskin the page without touching the layout rules further down.

## Deploying to GitHub Pages

1. Put these files in a GitHub repository (at the repo root, or in a `/docs` folder — your choice).
2. In the repo, go to **Settings → Pages**.
3. Under **Source**, choose the branch (and `/docs` folder if used).
4. Save. GitHub will give you a URL like `https://yourusername.github.io/your-repo/`.
5. Any time you edit `data.js` and push, the live page updates within a minute or two.

## Notes

- Since this is fully client-side, anyone can view `data.js` directly in their browser or dev tools — don't rely on it staying secret if that matters for your game.
- No dependencies beyond a Google Fonts link in `index.html`; everything else is plain HTML/CSS/JS.
