const DIFFICULTIES = {
  beginner:     { rows: 9,  cols: 9,  mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert:       { rows: 16, cols: 30, mines: 99 },
};

let state = {
  difficulty: 'beginner',
  board: [],
  revealed: [],
  flagged: [],
  question: [],
  mines: new Set(),
  gameOver: false,
  won: false,
  started: false,
  timerInterval: null,
  seconds: 0,
};

const $ = id => document.getElementById(id);

function getConfig() { return DIFFICULTIES[state.difficulty]; }

function initBoard() {
  const { rows, cols } = getConfig();
  state.board = Array.from({ length: rows }, () => Array(cols).fill(0));
  state.revealed = Array.from({ length: rows }, () => Array(cols).fill(false));
  state.flagged = Array.from({ length: rows }, () => Array(cols).fill(false));
  state.question = Array.from({ length: rows }, () => Array(cols).fill(false));
  state.mines = new Set();
  state.gameOver = false;
  state.won = false;
  state.started = false;
  state.seconds = 0;
  clearInterval(state.timerInterval);
  updateTimer();
  updateMineCount();
  $('reset-btn').textContent = '🙂';
  $('overlay').classList.add('hidden');
}

function placeMines(firstRow, firstCol) {
  const { rows, cols, mines } = getConfig();
  const forbidden = new Set();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = firstRow + dr, c = firstCol + dc;
      if (r >= 0 && r < rows && c >= 0 && c < cols) forbidden.add(r * cols + c);
    }
  }
  while (state.mines.size < mines) {
    const pos = Math.floor(Math.random() * rows * cols);
    if (!forbidden.has(pos)) state.mines.add(pos);
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (state.mines.has(r * cols + c)) {
        state.board[r][c] = -1;
      }
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (state.board[r][c] === -1) continue;
      state.board[r][c] = countAdjMines(r, c);
    }
  }
}

function countAdjMines(row, col) {
  const { rows, cols } = getConfig();
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const r = row + dr, c = col + dc;
      if (r >= 0 && r < rows && c >= 0 && c < cols && state.board[r][c] === -1) count++;
    }
  }
  return count;
}

function reveal(row, col) {
  const { rows, cols } = getConfig();
  if (row < 0 || row >= rows || col < 0 || col >= cols) return;
  if (state.revealed[row][col] || state.flagged[row][col]) return;

  state.revealed[row][col] = true;

  if (state.board[row][col] === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        reveal(row + dr, col + dc);
      }
    }
  }
}

function chord(row, col) {
  const { rows, cols } = getConfig();
  const n = state.board[row][col];
  if (n <= 0) return;
  let adjFlags = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr, c = col + dc;
      if (r >= 0 && r < rows && c >= 0 && c < cols && state.flagged[r][c]) adjFlags++;
    }
  }
  if (adjFlags === n) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = row + dr, c = col + dc;
        if (r >= 0 && r < rows && c >= 0 && c < cols && !state.flagged[r][c] && !state.revealed[r][c]) {
          if (state.board[r][c] === -1) { triggerGameOver(r, c); return; }
          reveal(r, c);
        }
      }
    }
    checkWin();
    renderBoard();
  }
}

function triggerGameOver(mineRow, mineCol) {
  state.gameOver = true;
  clearInterval(state.timerInterval);
  $('reset-btn').textContent = '😵';
  const { rows, cols } = getConfig();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isMine = state.board[r][c] === -1;
      const isFlagged = state.flagged[r][c];
      if (isMine && !isFlagged) state.revealed[r][c] = true;
      if (!isMine && isFlagged) state.revealed[r][c] = true;
    }
  }
  renderBoard();
  const explodedCell = document.querySelector(`[data-r="${mineRow}"][data-c="${mineCol}"]`);
  if (explodedCell) explodedCell.classList.add('exploded');
  setTimeout(() => showOverlay(false), 600);
}

function checkWin() {
  const { rows, cols } = getConfig();
  let unrevealed = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!state.revealed[r][c]) unrevealed++;
    }
  }
  if (unrevealed === state.mines.size) {
    state.won = true;
    state.gameOver = true;
    clearInterval(state.timerInterval);
    $('reset-btn').textContent = '😎';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (state.board[r][c] === -1) state.flagged[r][c] = true;
      }
    }
    updateMineCount();
    renderBoard();
    setTimeout(() => showOverlay(true), 400);
  }
}

function showOverlay(won) {
  $('overlay-emoji').textContent = won ? '🎉' : '💥';
  $('overlay-message').textContent = won ? 'Vous avez gagné !' : 'Boom ! Perdu !';
  if (won) {
    $('score-time-label').textContent = `Votre temps : ${state.seconds}s`;
    $('score-name').value = '';
    $('score-form').classList.remove('hidden');
  } else {
    $('score-form').classList.add('hidden');
  }
  $('overlay').classList.remove('hidden');
  if (won) setTimeout(() => $('score-name').focus(), 150);
}

function startTimer() {
  state.timerInterval = setInterval(() => {
    state.seconds = Math.min(state.seconds + 1, 999);
    updateTimer();
  }, 1000);
}

function updateTimer() {
  $('timer').textContent = String(state.seconds).padStart(3, '0');
}

function updateMineCount() {
  const { mines } = getConfig();
  let flagCount = 0;
  const { rows, cols } = getConfig();
  if (state.flagged.length) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (state.flagged[r][c]) flagCount++;
      }
    }
  }
  $('mines-left').textContent = mines - flagCount;
}

function renderBoard() {
  const { rows, cols } = getConfig();
  const board = $('board');
  board.style.gridTemplateColumns = `repeat(${cols}, 32px)`;

  const cells = board.querySelectorAll('.cell');
  if (cells.length !== rows * cols) {
    board.innerHTML = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        board.appendChild(cell);
      }
    }
  }

  board.querySelectorAll('.cell').forEach(cell => {
    const r = +cell.dataset.r;
    const c = +cell.dataset.c;
    const revealed = state.revealed[r][c];
    const flagged = state.flagged[r][c];
    const question = state.question[r][c];
    const val = state.board[r][c];

    cell.className = 'cell';
    cell.textContent = '';
    cell.removeAttribute('data-n');

    if (revealed) {
      cell.classList.add('revealed');
      if (val === -1) {
        if (flagged) {
          cell.classList.add('mine-wrong');
        } else {
          cell.classList.add('mine-revealed');
        }
      } else if (val > 0) {
        cell.textContent = val;
        cell.dataset.n = val;
      }
    } else if (flagged) {
      cell.classList.add('flagged');
    } else if (question) {
      cell.classList.add('question');
    }
  });
}

function handleClick(e) {
  if (state.gameOver || state._longPressBlocked) return;
  const cell = e.target.closest('.cell');
  if (!cell) return;
  const r = +cell.dataset.r;
  const c = +cell.dataset.c;

  if (state.flagged[r][c] || state.question[r][c]) return;

  if (state.revealed[r][c]) {
    chord(r, c);
    return;
  }

  if (!state.started) {
    state.started = true;
    placeMines(r, c);
    startTimer();
  }

  if (state.board[r][c] === -1) {
    state.revealed[r][c] = true;
    triggerGameOver(r, c);
    return;
  }

  reveal(r, c);
  checkWin();
  renderBoard();
}

function handleRightClick(e) {
  e.preventDefault();
  if (state._longPressBlocked) return;
  cycleFlag(e.target.closest('.cell'));
}

function cycleFlag(cell) {
  if (!cell || state.gameOver) return;
  const r = +cell.dataset.r;
  const c = +cell.dataset.c;
  if (state.revealed[r][c]) return;

  if (!state.flagged[r][c] && !state.question[r][c]) {
    state.flagged[r][c] = true;
  } else if (state.flagged[r][c]) {
    state.flagged[r][c] = false;
    state.question[r][c] = true;
  } else {
    state.question[r][c] = false;
  }

  updateMineCount();
  renderBoard();
}

function placeFlag(cell) {
  if (!cell || state.gameOver) return;
  const r = +cell.dataset.r;
  const c = +cell.dataset.c;
  if (state.revealed[r][c]) return;

  state.question[r][c] = false;
  state.flagged[r][c] = !state.flagged[r][c];

  updateMineCount();
  renderBoard();
}

// Long press for touch devices
let _longPressTimer = null;

$('board').addEventListener('touchstart', e => {
  state._longPressBlocked = false;
  const cell = e.target.closest('.cell');
  if (!cell) return;
  _longPressTimer = setTimeout(() => {
    state._longPressBlocked = true;
    placeFlag(cell);
    navigator.vibrate?.(40);
  }, 450);
}, { passive: true });

$('board').addEventListener('touchmove', () => {
  clearTimeout(_longPressTimer);
  _longPressTimer = null;
}, { passive: true });

$('board').addEventListener('touchend', () => {
  clearTimeout(_longPressTimer);
  _longPressTimer = null;
}, { passive: true });

function reset() {
  initBoard();
  renderBoard();
}

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.difficulty = btn.dataset.diff;
    reset();
  });
});

// Score submission
$('score-form').addEventListener('submit', async e => {
  e.preventDefault();
  const name = $('score-name').value.trim();
  if (!name) return;
  try {
    await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, difficulty: state.difficulty, time: state.seconds }),
    });
  } catch (_) {}
  $('score-form').classList.add('hidden');
  openLeaderboard(state.difficulty);
});

// Leaderboard
let lbDiff = 'beginner';

async function openLeaderboard(diff) {
  $('overlay').classList.add('hidden');
  lbDiff = diff || state.difficulty;
  document.querySelectorAll('.lb-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.diff === lbDiff);
  });
  await loadLeaderboard();
  $('lb-modal').classList.remove('hidden');
}

async function loadLeaderboard() {
  const body = $('lb-body');
  body.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#888">Chargement…</td></tr>';
  $('lb-empty').classList.add('hidden');
  try {
    const res = await fetch(`/api/scores/${lbDiff}`);
    const rows = await res.json();
    body.innerHTML = '';
    if (rows.length === 0) {
      $('lb-empty').classList.remove('hidden');
    } else {
      rows.forEach((row, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i + 1}</td><td>${escHtml(row.name)}</td><td>${row.time}s</td>`;
        body.appendChild(tr);
      });
    }
  } catch (_) {
    body.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#e57373">Erreur de chargement</td></tr>';
  }
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

document.querySelectorAll('.lb-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    lbDiff = btn.dataset.diff;
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.toggle('active', t === btn));
    loadLeaderboard();
  });
});

$('lb-btn').addEventListener('click', () => openLeaderboard());
$('lb-close').addEventListener('click', () => $('lb-modal').classList.add('hidden'));
$('lb-modal').addEventListener('click', e => { if (e.target === $('lb-modal')) $('lb-modal').classList.add('hidden'); });

$('reset-btn').addEventListener('click', reset);
$('overlay-btn').addEventListener('click', reset);
$('board').addEventListener('click', handleClick);
$('board').addEventListener('contextmenu', handleRightClick);

reset();
