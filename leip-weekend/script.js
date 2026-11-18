// Combination Check — game logic
// All options and valid combinations are loaded from data.js (see README.md).

const STORAGE_KEY = 'combo-check-progress-v1';

const DEFAULT_TIMER = { durationSeconds: 600 };
const DEFAULT_SCORING = {
  pointsPerMinuteRemaining: 1,
  wrongGuessPenalty: 2,
  correctGuessBase: 2
};
const DEFAULT_LOCK_IN = { minCorrectCombos: 1 };

const state = {
  options: [],
  optionById: new Map(),
  validCombos: [],
  validComboKeys: new Set(),
  solvedComboKeys: new Set(),
  solvedOrder: [],
  solvedOptionIds: new Set(),
  wrongAttempts: 0,
  firstOpenedAt: null,
  endedReason: null,
  frozenRemainingSeconds: null,
  timerDurationSeconds: DEFAULT_TIMER.durationSeconds,
  scoring: { ...DEFAULT_SCORING },
  lockInMinCorrectCombos: DEFAULT_LOCK_IN.minCorrectCombos,
  optionOrder: [],
  selected: [],
  tickInterval: null
};

const els = {
  title: document.getElementById('game-title'),
  subtitle: document.getElementById('game-subtitle'),
  timerDisplay: document.getElementById('timer-display'),
  scoreDisplay: document.getElementById('score-display'),
  dialRow: document.getElementById('dial-row'),
  traySection: document.querySelector('.tray'),
  traySlots: Array.from(document.querySelectorAll('.tray-slot')),
  grid: document.getElementById('options-grid'),
  checkBtn: document.getElementById('check-btn'),
  feedback: document.getElementById('feedback'),
  progressText: document.getElementById('progress-text'),
  statsText: document.getElementById('stats-text'),
  resetBtn: document.getElementById('reset-btn'),
  lockBtn: document.getElementById('lock-btn')
};

function comboKey(ids) {
  return [...ids].sort().join('::');
}

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function isValidOptionOrder(orderIds, options) {
  if (!Array.isArray(orderIds) || orderIds.length !== options.length) return false;
  const optionIds = new Set(options.map(o => o.id));
  if (orderIds.length !== optionIds.size) return false;
  return orderIds.every(id => optionIds.has(id));
}

function orderOptionsByIds(options, orderIds) {
  const byId = new Map(options.map(o => [o.id, o]));
  return orderIds.map(id => byId.get(id));
}

function resolveOptions(rawOptions, storedOrderIds) {
  const options = Array.isArray(rawOptions) ? rawOptions : [];
  if (isValidOptionOrder(storedOrderIds, options)) {
    return {
      options: orderOptionsByIds(options, storedOrderIds),
      orderIds: storedOrderIds
    };
  }
  const shuffled = shuffleArray(options);
  return {
    options: shuffled,
    orderIds: shuffled.map(o => o.id)
  };
}

function isGameActive() {
  return !state.endedReason;
}

function allCombosSolved() {
  return state.validCombos.length > 0 && state.solvedComboKeys.size === state.validCombos.length;
}

function canLockIn() {
  return isGameActive() && state.solvedComboKeys.size >= state.lockInMinCorrectCombos;
}

function formatTime(seconds) {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function computeRemainingFromClock() {
  const start = state.firstOpenedAt ? new Date(state.firstOpenedAt).getTime() : Date.now();
  const elapsed = Math.floor((Date.now() - start) / 1000);
  return Math.max(0, state.timerDurationSeconds - elapsed);
}

function getRemainingSeconds() {
  if (state.endedReason) {
    return state.frozenRemainingSeconds ?? 0;
  }
  return computeRemainingFromClock();
}

function computeScore(remainingSeconds) {
  const { pointsPerMinuteRemaining, wrongGuessPenalty, correctGuessBase } = state.scoring;
  const timeScore = Math.floor(remainingSeconds / 60) * pointsPerMinuteRemaining;
  const wrongScore = -(wrongGuessPenalty * state.wrongAttempts);
  let correctScore = 0;
  for (let i = 0; i < state.solvedOrder.length; i++) {
    correctScore += correctGuessBase * (i + 1);
  }
  return timeScore + wrongScore + correctScore;
}

function loadStoredState() {
  const defaults = {
    solvedComboKeys: new Set(),
    solvedOrder: [],
    wrongAttempts: 0,
    firstOpenedAt: new Date().toISOString(),
    endedReason: null,
    frozenRemainingSeconds: null,
    optionOrder: []
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;

    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      const keys = data;
      return {
        solvedComboKeys: new Set(keys),
        solvedOrder: [...keys],
        wrongAttempts: 0,
        firstOpenedAt: new Date().toISOString(),
        endedReason: null,
        frozenRemainingSeconds: null,
        optionOrder: []
      };
    }

    if (data && typeof data === 'object') {
      const solvedComboKeys = new Set(Array.isArray(data.solvedComboKeys) ? data.solvedComboKeys : []);
      let solvedOrder = Array.isArray(data.solvedOrder) ? data.solvedOrder : [];
      if (solvedOrder.length === 0 && solvedComboKeys.size > 0) {
        solvedOrder = [...solvedComboKeys];
      }

      return {
        solvedComboKeys,
        solvedOrder,
        wrongAttempts: typeof data.wrongAttempts === 'number' ? data.wrongAttempts : 0,
        firstOpenedAt: typeof data.firstOpenedAt === 'string'
          ? data.firstOpenedAt
          : new Date().toISOString(),
        endedReason: data.endedReason === 'locked' || data.endedReason === 'expired'
          ? data.endedReason
          : null,
        frozenRemainingSeconds: typeof data.frozenRemainingSeconds === 'number'
          ? data.frozenRemainingSeconds
          : null,
        optionOrder: Array.isArray(data.optionOrder) ? data.optionOrder : []
      };
    }
  } catch (err) {
    /* fall through to defaults */
  }

  return defaults;
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      solvedComboKeys: [...state.solvedComboKeys],
      solvedOrder: state.solvedOrder,
      wrongAttempts: state.wrongAttempts,
      firstOpenedAt: state.firstOpenedAt,
      endedReason: state.endedReason,
      frozenRemainingSeconds: state.frozenRemainingSeconds,
      optionOrder: state.optionOrder
    }));
  } catch (err) {
    // localStorage unavailable (private browsing, storage full, etc.) — progress just won't persist.
  }
}

function recomputeSolvedOptionIds() {
  state.solvedOptionIds = new Set();
  for (const combo of state.validCombos) {
    if (state.solvedComboKeys.has(comboKey(combo))) {
      combo.forEach(id => state.solvedOptionIds.add(id));
    }
  }
}

function loadGameData() {
  if (window.GAME_DATA && typeof window.GAME_DATA === 'object') {
    const data = window.GAME_DATA;
    const combos = Array.isArray(data.combos)
      ? data.combos.filter(c => Array.isArray(c) && c.length === 3)
      : [];
    return {
      ...data,
      options: combos.flat(),
      validCombos: combos.map(combo => combo.map(o => o.id))
    };
  }
  throw new Error('No game data found');
}

function stopTimer() {
  if (state.tickInterval !== null) {
    clearInterval(state.tickInterval);
    state.tickInterval = null;
  }
}

function startTimer() {
  if (!isGameActive()) return;
  stopTimer();
  state.tickInterval = setInterval(onTimerTick, 1000);
  onTimerTick();
}

function onTimerTick() {
  if (!isGameActive()) {
    stopTimer();
    return;
  }

  const remaining = computeRemainingFromClock();
  updateTimerDisplay(remaining);
  updateScoreDisplay(remaining);

  if (remaining <= 0) {
    endGame('expired');
  }
}

function endGame(reason) {
  if (state.endedReason) return;

  state.endedReason = reason;
  state.frozenRemainingSeconds = computeRemainingFromClock();
  state.selected = [];
  stopTimer();
  saveProgress();

  renderOptions();
  renderTray();
  updateCheckButton();
  updateTimerDisplay();
  updateScoreDisplay();
  updateLockButton();
}

function updateTimerDisplay(remaining) {
  const seconds = remaining ?? getRemainingSeconds();
  els.timerDisplay.textContent = '\u23F1 ' + formatTime(seconds);
}

function updateScoreDisplay(remaining) {
  const seconds = remaining ?? getRemainingSeconds();
  els.scoreDisplay.textContent = '\u2605 Score: ' + computeScore(seconds);
}

function updateLockButton() {
  els.lockBtn.disabled = !canLockIn();
}

function maybeAutoLockIn() {
  if (!isGameActive() || !allCombosSolved()) return false;

  endGame('locked');
  updateStatsText();
  showFeedback('All combinations found — score locked in.', 'success');
  return true;
}

function init() {
  stopTimer();

  let data;
  try {
    data = loadGameData();
  } catch (err) {
    showFeedback('Could not load game data. Check that data.js exists and is valid.', 'error');
    return;
  }

  state.validCombos = Array.isArray(data.validCombos)
    ? data.validCombos.filter(c => Array.isArray(c) && c.length === 3)
    : [];
  state.validComboKeys = new Set(state.validCombos.map(comboKey));

  state.timerDurationSeconds = typeof data.timer?.durationSeconds === 'number'
    ? data.timer.durationSeconds
    : DEFAULT_TIMER.durationSeconds;
  state.scoring = {
    pointsPerMinuteRemaining: typeof data.scoring?.pointsPerMinuteRemaining === 'number'
      ? data.scoring.pointsPerMinuteRemaining
      : DEFAULT_SCORING.pointsPerMinuteRemaining,
    wrongGuessPenalty: typeof data.scoring?.wrongGuessPenalty === 'number'
      ? data.scoring.wrongGuessPenalty
      : DEFAULT_SCORING.wrongGuessPenalty,
    correctGuessBase: typeof data.scoring?.correctGuessBase === 'number'
      ? data.scoring.correctGuessBase
      : DEFAULT_SCORING.correctGuessBase
  };
  state.lockInMinCorrectCombos = typeof data.lockIn?.minCorrectCombos === 'number'
    ? data.lockIn.minCorrectCombos
    : DEFAULT_LOCK_IN.minCorrectCombos;

  if (data.title) els.title.textContent = data.title;
  if (data.subtitle) els.subtitle.textContent = data.subtitle;

  const stored = loadStoredState();
  const resolved = resolveOptions(data.options, stored.optionOrder);
  state.options = resolved.options;
  state.optionOrder = resolved.orderIds;
  state.optionById = new Map(state.options.map(o => [o.id, o]));

  state.solvedComboKeys = new Set([...stored.solvedComboKeys].filter(k => state.validComboKeys.has(k)));
  state.solvedOrder = stored.solvedOrder.filter(k => state.validComboKeys.has(k));
  state.wrongAttempts = stored.wrongAttempts;
  state.firstOpenedAt = stored.firstOpenedAt;
  state.endedReason = stored.endedReason;
  state.frozenRemainingSeconds = stored.frozenRemainingSeconds;

  if (!state.endedReason && computeRemainingFromClock() <= 0) {
    state.endedReason = 'expired';
    state.frozenRemainingSeconds = 0;
  }

  if (state.endedReason && state.frozenRemainingSeconds === null) {
    state.frozenRemainingSeconds = 0;
  }

  saveProgress();
  recomputeSolvedOptionIds();

  renderDial();
  renderOptions();
  renderTray();
  updateProgressText();
  updateStatsText();
  updateCheckButton();
  updateTimerDisplay();
  updateScoreDisplay();
  updateLockButton();

  if (isGameActive()) {
    if (maybeAutoLockIn()) return;
    startTimer();
  }
}

function renderDial() {
  els.dialRow.innerHTML = '';
  state.validCombos.forEach(combo => {
    const dot = document.createElement('span');
    dot.className = 'dial' + (state.solvedComboKeys.has(comboKey(combo)) ? ' lit' : '');
    els.dialRow.appendChild(dot);
  });
}

function renderOptions() {
  els.grid.innerHTML = '';
  state.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-tile';
    btn.textContent = opt.label;
    btn.dataset.id = opt.id;

    const isSolved = state.solvedOptionIds.has(opt.id);
    const isSelected = state.selected.includes(opt.id);

    if (isSolved) {
      btn.classList.add('solved');
      btn.disabled = true;
      btn.setAttribute('aria-label', opt.label + ' (already solved)');
    } else if (!isGameActive()) {
      btn.classList.add('expired');
      btn.disabled = true;
      btn.setAttribute('aria-label', opt.label + ' (game ended)');
    } else {
      btn.setAttribute('aria-pressed', String(isSelected));
      if (isSelected) btn.classList.add('selected');
      btn.addEventListener('click', () => onOptionClick(opt.id));
    }

    els.grid.appendChild(btn);
  });
}

function renderTray() {
  els.traySlots.forEach((slot, i) => {
    const id = state.selected[i];
    if (id) {
      const opt = state.optionById.get(id);
      slot.innerHTML = '';
      const span = document.createElement('span');
      span.textContent = opt ? opt.label : id;
      slot.appendChild(span);
      slot.classList.add('filled');
    } else {
      slot.innerHTML = '<span class="tray-empty">&mdash;</span>';
      slot.classList.remove('filled');
    }
  });
}

function updateProgressText() {
  const total = state.validCombos.length;
  const found = state.solvedComboKeys.size;
  els.progressText.textContent = total ? found + ' of ' + total + ' found' : '';
}

function updateStatsText() {
  const wrongLabel = state.wrongAttempts === 1 ? 'wrong attempt' : 'wrong attempts';
  const openedAt = state.firstOpenedAt ? new Date(state.firstOpenedAt) : null;
  const openedLabel = openedAt && !Number.isNaN(openedAt.getTime())
    ? 'Started ' + openedAt.toLocaleString()
    : '';

  const parts = [state.wrongAttempts + ' ' + wrongLabel, openedLabel];
  if (state.endedReason === 'locked') parts.unshift('Locked in');
  if (state.endedReason === 'expired') parts.unshift('Time expired');

  els.statsText.textContent = parts.filter(Boolean).join(' · ');
}

function updateCheckButton() {
  els.checkBtn.disabled = !isGameActive() || state.selected.length !== 3;
}

function clearFeedback() {
  els.feedback.textContent = '';
  els.feedback.className = 'feedback';
}

function showFeedback(message, type) {
  els.feedback.textContent = message;
  els.feedback.className = 'feedback' + (type ? ' ' + type : '');
}

function triggerTrayEffect(type) {
  els.traySection.classList.remove('success', 'error', 'shake');
  void els.traySection.offsetWidth; // restart CSS animation
  els.traySection.classList.add(type);
  if (type === 'error') els.traySection.classList.add('shake');
  setTimeout(() => {
    els.traySection.classList.remove('success', 'error', 'shake');
  }, 700);
}

function onOptionClick(id) {
  if (!isGameActive()) return;

  const idx = state.selected.indexOf(id);
  if (idx !== -1) {
    state.selected.splice(idx, 1);
  } else if (state.selected.length < 3) {
    state.selected.push(id);
  } else {
    triggerTrayEffect('error');
    showFeedback('Only three at a time — remove one to swap it out.', 'error');
    return;
  }
  clearFeedback();
  renderOptions();
  renderTray();
  updateCheckButton();
}

function onCheck() {
  if (!isGameActive()) return;
  if (state.selected.length !== 3) return;

  const key = comboKey(state.selected);

  if (state.validComboKeys.has(key)) {
    if (!state.solvedComboKeys.has(key)) {
      state.solvedComboKeys.add(key);
      state.solvedOrder.push(key);
      saveProgress();
      recomputeSolvedOptionIds();
    }
    triggerTrayEffect('success');
    showFeedback('Correct! That combination is locked in.', 'success');
  } else {
    state.wrongAttempts += 1;
    saveProgress();
    triggerTrayEffect('error');
    showFeedback('Not quite — try a different combination.', 'error');
  }

  state.selected = [];
  renderDial();
  renderOptions();
  renderTray();
  updateProgressText();
  updateStatsText();
  updateCheckButton();
  updateScoreDisplay();
  updateLockButton();
  if (maybeAutoLockIn()) return;
}

function onLockIn() {
  if (!canLockIn()) return;

  const ok = window.confirm('Lock in your score and end the game? This can\'t be undone.');
  if (!ok) return;

  endGame('locked');
  updateStatsText();
  clearFeedback();
}

function onReset() {
  const ok = window.confirm('Reset all progress on this device? This cannot be undone.');
  if (!ok) return;

  stopTimer();
  try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ }

  let data;
  try {
    data = loadGameData();
  } catch (err) {
    showFeedback('Could not load game data. Check that data.js exists and is valid.', 'error');
    return;
  }

  const resolved = resolveOptions(data.options, null);
  state.options = resolved.options;
  state.optionOrder = resolved.orderIds;
  state.optionById = new Map(state.options.map(o => [o.id, o]));
  state.solvedComboKeys = new Set();
  state.solvedOrder = [];
  state.wrongAttempts = 0;
  state.firstOpenedAt = new Date().toISOString();
  state.endedReason = null;
  state.frozenRemainingSeconds = null;
  state.selected = [];

  saveProgress();
  recomputeSolvedOptionIds();
  clearFeedback();
  renderDial();
  renderOptions();
  renderTray();
  updateProgressText();
  updateStatsText();
  updateCheckButton();
  updateTimerDisplay();
  updateScoreDisplay();
  updateLockButton();
  startTimer();
}

els.checkBtn.addEventListener('click', onCheck);
els.resetBtn.addEventListener('click', onReset);
els.lockBtn.addEventListener('click', onLockIn);

function boot() {
  init();
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) boot();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
