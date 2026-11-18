// Game configuration — edit this file for a new game (see README.md).
window.GAME_DATA = {
  "title": "Combination Check",
  "subtitle": "Select three. Confirm the code.",
  "combos": [
    [
      { "id": "suspension", "label": "Fs" },
      { "id": "feather", "label": "F5" },
      { "id": "boat", "label": "Bx" },
    ],
    [
      { "id": "piano", "label": "A4" },
      { "id": "bird-wing", "label": "F2" },
      { "id": "building-wing", "label": "A-F" },
    ],
    [
      { "id": "ij", "label": "52N" },
      { "id": "boiled-egg", "label": "S" },
      { "id": "blue-bump", "label": "BB" },
    ],
    [
      { "id": "bloemen", "label": "B12" },
      { "id": "chocolade", "label": "C6" },
      { "id": "liefdes-brief", "label": "L0" },
    ],
    [
      { "id": "decatlon", "label": "D5" },
      { "id": "discus-thrower", "label": "B88" },
      { "id": "marathon", "label": "R5" },
    ],
    [
      { "id": "amster-dam", "label": "1D" },
      { "id": "dammen", "label": "10X" },
      { "id": "water-dam", "label": "H2" },
    ],
  ],
  "timer": {
    "durationSeconds": 7200
  },
  "scoring": {
    "pointsPerMinuteRemaining": 1,
    "wrongGuessPenalty": 2,
    "correctGuessBase": 2
  },
  "lockIn": {
    "minCorrectCombos": 5
  }
};
