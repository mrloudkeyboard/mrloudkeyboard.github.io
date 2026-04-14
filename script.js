const ROWS = 8,
  COLS = 10,
  MINES = 10;
let board = [],
  firstClick = true,
  gameOver = false,
  timerInterval,
  seconds = 0,
  flags = MINES;

// Mobile Menu State
let activeMenuTile = null;

// Audio Engine - All volumes balanced to ~0.1
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq, type, duration, vol = 0.1) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    audioCtx.currentTime + duration
  );
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

const sounds = {
  dig: () => playTone(450, "sine", 0.1, 0.1),
  flag: () => playTone(600, "triangle", 0.1, 0.1),
  boom: () => playTone(70, "sawtooth", 0.6, 0.1),
  reveal: () => playTone(250, "sine", 0.1, 0.08),
  win: () => {
    playTone(523, "sine", 0.2, 0.1);
    setTimeout(() => playTone(659, "sine", 0.2, 0.1), 150);
    setTimeout(() => playTone(784, "sine", 0.4, 0.1), 300);
  },
};

function init() {
  const boardEl = document.getElementById("board");
  boardEl.innerHTML = "";
  board = [];
  firstClick = true;
  gameOver = false;
  seconds = 0;
  flags = MINES;
  clearInterval(timerInterval);
  hideMobileMenu();
  document.getElementById("timer").innerText = "000";
  document.getElementById("flag-count").innerText = MINES;
  document.getElementById("overlay").className = "overlay-hidden";
  document.getElementById("view-round-controls").className = "controls-hidden";

  for (let r = 0; r < ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) {
      const el = document.createElement("div");
      el.className = `tile ${(r + c) % 2 === 0 ? "light" : "dark"}`;

      // Use PointerEvents for better mobile/desktop handling
      el.onpointerdown = (e) => handleClick(e, r, c);
      el.oncontextmenu = (e) => e.preventDefault();

      boardEl.appendChild(el);
      board[r][c] = {
        r,
        c,
        isMine: false,
        revealed: false,
        flagged: false,
        n: 0,
        el,
      };
    }
  }
}

function handleClick(e, r, c) {
  if (gameOver) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  const isMobile = window.matchMedia("(max-width: 600px)").matches;
  const t = board[r][c];

  // Right click always flags (Desktop)
  if (e.button === 2) {
    toggleFlag(r, c);
    return;
  }

  // Left click / Tap logic
  if (isMobile && !t.revealed) {
    showMobileMenu(e, r, c);
  } else {
    if (t.revealed) {
      chord(r, c);
    } else {
      if (firstClick) handleFirstClick(r, c);
      reveal(r, c);
    }
  }
}

function showMobileMenu(e, r, c) {
  let menu = document.getElementById("mobile-menu");
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "mobile-menu";
    menu.innerHTML = `<button id="m-dig">⛏️</button><button id="m-flag">🚩</button>`;
    document.body.appendChild(menu);

    document.getElementById("m-dig").onclick = () => {
      if (firstClick) handleFirstClick(activeMenuTile.r, activeMenuTile.c);
      reveal(activeMenuTile.r, activeMenuTile.c);
      hideMobileMenu();
    };
    document.getElementById("m-flag").onclick = () => {
      toggleFlag(activeMenuTile.r, activeMenuTile.c);
      hideMobileMenu();
    };
  }

  activeMenuTile = board[r][c];
  menu.style.display = "flex";
  menu.style.left = `${e.pageX}px`;
  menu.style.top = `${e.pageY - 60}px`;
}

function hideMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  if (menu) menu.style.display = "none";
}

function handleFirstClick(startR, startC) {
  firstClick = false;
  generateMines(startR, startC);
  startTimer();
  createBurst(board[startR][startC].el, "#e5c29f");
}

function generateMines(startR, startC) {
  let count = 0;
  while (count < MINES) {
    let r = Math.floor(Math.random() * ROWS),
      c = Math.floor(Math.random() * COLS);
    if (
      !board[r][c].isMine &&
      (Math.abs(r - startR) > 1 || Math.abs(c - startC) > 1)
    ) {
      board[r][c].isMine = true;
      count++;
    }
  }
  board.forEach((row, r) =>
    row.forEach((t, c) => {
      if (t.isMine) return;
      traverseNeighbors(r, c, (nr, nc) => {
        if (board[nr][nc].isMine) t.n++;
      });
    })
  );
}

function reveal(r, c) {
  const t = board[r][c];
  if (t.revealed || t.flagged) return;

  t.revealed = true;
  sounds.dig();
  t.el.classList.add("revealed", (r + c) % 2 === 0 ? "rev-light" : "rev-dark");

  if (t.isMine) {
    explode(r, c);
    return;
  }

  if (t.n > 0) {
    t.el.innerText = t.n;
    t.el.classList.add(`n${t.n}`);
  } else {
    traverseNeighbors(r, c, (nr, nc) => reveal(nr, nc));
  }
  checkWin();
}

function chord(r, c) {
  let f = 0;
  traverseNeighbors(r, c, (nr, nc) => {
    if (board[nr][nc].flagged) f++;
  });
  if (f === board[r][c].n) {
    traverseNeighbors(r, c, (nr, nc) => {
      if (!board[nr][nc].revealed && !board[nr][nc].flagged) reveal(nr, nc);
    });
  }
}

async function explode(hitR, hitC) {
  gameOver = true;
  clearInterval(timerInterval);
  sounds.boom();

  const trigger = board[hitR][hitC];
  trigger.el.classList.add("trigger-mine");
  trigger.el.innerText = "💣";
  screenShake(500);

  // Initial pause after hitting the mine
  await new Promise((res) => setTimeout(res, 800));

  // Loop through all tiles to reveal mines and flags
  for (let row of board) {
    for (let t of row) {
      if (t === trigger) continue;

      // Check if it's a mine or a flag that needs revealing
      if (t.isMine || t.flagged) {
        sounds.reveal();

        if (t.isMine && t.flagged) {
          t.el.classList.add("correct-flag");
        } else if (t.isMine && !t.flagged) {
          t.el.classList.add("unflagged-mine");
          t.el.innerText = "💣";
        } else if (!t.isMine && t.flagged) {
          t.el.classList.add("false-flag");
        }

        // Wait 0.5 seconds before revealing the next item
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  // Wait 2 seconds after the final reveal before showing UI
  setTimeout(() => {
    document.getElementById("result-title").innerText = "GAME OVER";
    showSummary();
  }, 2000);
}

function toggleFlag(r, c) {
  const t = board[r][c];
  if (t.revealed) return;
  t.flagged = !t.flagged;
  t.el.innerText = t.flagged ? "🚩" : "";
  flags += t.flagged ? -1 : 1;
  document.getElementById("flag-count").innerText = flags;
  sounds.flag();
}

function traverseNeighbors(r, c, cb) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      let nr = r + dr,
        nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !(dr == 0 && dc == 0))
        cb(nr, nc);
    }
  }
}

function createBurst(el, color) {
  const rect = el.getBoundingClientRect();
  for (let i = 0; i < 10; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.backgroundColor = color;
    p.style.left = `${rect.left + rect.width / 2}px`;
    p.style.top = `${rect.top + rect.height / 2}px`;
    p.style.setProperty("--x", `${(Math.random() - 0.5) * 80}px`);
    p.style.setProperty("--y", `${(Math.random() - 0.5) * 80}px`);
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 600);
  }
}

function screenShake(ms) {
  document.body.classList.add("shake");
  setTimeout(() => document.body.classList.remove("shake"), ms);
}

function startTimer() {
  timerInterval = setInterval(() => {
    seconds++;
    document.getElementById("timer").innerText = seconds
      .toString()
      .padStart(3, "0");
  }, 1000);
}

function showSummary() {
  document.getElementById("final-time").innerText = seconds;
  let f = 0,
    u = 0;
  board.forEach((row) =>
    row.forEach((t) => {
      if (t.isMine) t.flagged ? f++ : u++;
    })
  );
  document.getElementById("final-flagged").innerText = f;
  document.getElementById("final-unflagged").innerText = u;
  document.getElementById("overlay").className = "";
}

function checkWin() {
  let safe = 0;
  board.forEach((row) =>
    row.forEach((t) => {
      if (!t.isMine && !t.revealed) safe++;
    })
  );
  if (safe === 0) {
    gameOver = true;
    clearInterval(timerInterval);
    sounds.win();
    document.getElementById("result-title").innerText = "CLEARED!";
    showSummary();
  }
}

document.getElementById("btn-play-again").onclick = init;
document.getElementById("btn-play-again-alt").onclick = init;
document.getElementById("btn-view-round").onclick = () => {
  document.getElementById("overlay").className = "overlay-hidden";
  document.getElementById("view-round-controls").className = "";
};
document.getElementById("btn-view-summary").onclick = () => {
  document.getElementById("overlay").className = "";
  document.getElementById("view-round-controls").className = "controls-hidden";
};

// Global click to hide mobile menu if clicking elsewhere
window.onclick = (e) => {
  if (!e.target.classList.contains("tile") && !e.target.closest("#mobile-menu"))
    hideMobileMenu();
};

init();
