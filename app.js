
const resultWords = ["abborre", "afton", "alster", "ansats", "arvode", "avstamp", "balans", "barrskog", "begrepp", "besked", "betraktelse", "blomning", "boplats", "bråddjup", "bäck", "dager", "dallring", "dunge", "eftertanke", "eldstad", "famn", "fjärran", "flöde", "föraning", "försprång", "gryning", "gäspning", "havsbris", "hågkomst", "höstlöv", "inblick", "klang", "klinga", "klöver", "krusning", "källa", "lindring", "ljusglimt", "mellanrum", "morgonrodnad", "nyans", "närvaro", "omväg", "ordflöde", "perspektiv", "rand", "resning", "rörelse", "samsyn", "skymning", "stjärnfall", "stråk", "susning", "svall", "tanke", "tillförsikt", "tjärn", "utsikt", "vingslag", "vårvind", "vägskäl", "återsken", "ängsmark", "överblick"];

const screens = {
  start: document.querySelector('#start-screen'),
  game: document.querySelector('#game-screen'),
  result: document.querySelector('#result-screen')
};

const state = {
  questions: [],
  pool: [],
  current: null,
  score: 0,
  lives: 3,
  correct: 0,
  wrong: 0,
  streak: 0,
  bestStreak: 0,
  timeLeft: 60,
  timerId: null,
  locked: false,
  latestResult: null,
  scoreSaved: false,
  editorMode: false
};

const el = id => document.getElementById(id);

function showScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[name].classList.add('active');
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function loadQuestions() {
  const response = await fetch('questions.json');
  if (!response.ok) throw new Error('Kunde inte läsa questions.json');
  state.questions = await response.json();
}

function resetGame() {
  clearInterval(state.timerId);
  Object.assign(state, {
    pool: [],
    current: null,
    score: 0,
    lives: 3,
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    timeLeft: 60,
    timerId: null,
    locked: false,
    latestResult: null,
    scoreSaved: false
  });
  updateHud();
}

function updateHud() {
  el('timer').textContent = state.timeLeft;
  el('score').textContent = state.score;
  el('lives').textContent = '❤️'.repeat(state.lives) || '—';
  el('streak').textContent = state.streak;
  el('correct-count').textContent = state.correct;
  el('time-bar').style.width = `${Math.max(0, state.timeLeft / 60 * 100)}%`;
}


const QUESTION_DECK_KEY = 'hpOrdQuestionDeckV1';
const RECENT_QUESTIONS_KEY = 'hpOrdRecentQuestionsV1';
const RECENT_BUFFER_SIZE = 50;

function questionId(question) {
  if (question.id) return String(question.id);
  return [
    question.word,
    question.exam || '',
    question.pass || '',
    question.question || '',
    question.source || ''
  ].join('|').toLocaleLowerCase('sv-SE');
}

function readStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function createFreshDeck() {
  const recent = new Set(readStoredArray(RECENT_QUESTIONS_KEY));
  const allIds = state.questions.map(questionId);
  const notRecent = shuffle(allIds.filter(id => !recent.has(id)));
  const recentlySeen = shuffle(allIds.filter(id => recent.has(id)));
  return [...notRecent, ...recentlySeen];
}

function getQuestionDeck() {
  const validIds = new Set(state.questions.map(questionId));
  let deck = readStoredArray(QUESTION_DECK_KEY).filter(id => validIds.has(id));

  // If questions were added since the last visit, insert all new IDs into the
  // remaining deck in random positions instead of waiting for the next cycle.
  const inDeck = new Set(deck);
  const recent = new Set(readStoredArray(RECENT_QUESTIONS_KEY));
  const missingIds = state.questions
    .map(questionId)
    .filter(id => !inDeck.has(id) && !recent.has(id));

  for (const id of shuffle(missingIds)) {
    const position = Math.floor(Math.random() * (deck.length + 1));
    deck.splice(position, 0, id);
  }

  if (deck.length === 0) deck = createFreshDeck();
  localStorage.setItem(QUESTION_DECK_KEY, JSON.stringify(deck));
  return deck;
}

function drawPersistentQuestion() {
  let deck = getQuestionDeck();
  const id = deck.shift();
  localStorage.setItem(QUESTION_DECK_KEY, JSON.stringify(deck));

  const recent = readStoredArray(RECENT_QUESTIONS_KEY);
  recent.push(id);
  localStorage.setItem(
    RECENT_QUESTIONS_KEY,
    JSON.stringify(recent.slice(-RECENT_BUFFER_SIZE))
  );

  return state.questions.find(question => questionId(question) === id) || null;
}

function nextQuestion() {
  if (state.timeLeft <= 0 || state.lives <= 0) return endGame();
  state.locked = false;
  el('feedback').textContent = '';

  state.current = drawPersistentQuestion();
  if (!state.current) return endGame();

  el('word').textContent = state.current.word;
  const answerBox = el('answers');
  answerBox.innerHTML = '';

  const shuffledOptions = shuffle(
    state.current.options.map((text, index) => ({
      text,
      isCorrect: index === state.current.correct
    }))
  );

  shuffledOptions.forEach((option, index) => {
    const button = document.createElement('button');
    button.className = 'answer';
    button.textContent = `${String.fromCharCode(65 + index)}. ${option.text}`;
    button.addEventListener('click', () => chooseAnswer(button, option.isCorrect));
    answerBox.appendChild(button);
  });
}

function chooseAnswer(button, isCorrect) {
  if (state.locked) return;
  state.locked = true;

  const buttons = [...document.querySelectorAll('.answer')];
  buttons.forEach(btn => btn.disabled = true);

  if (isCorrect) {
    state.correct++;
    state.streak++;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.score += 100;
    button.classList.add('correct');
    el('feedback').textContent = 'Rätt! +100 poäng';
  } else {
    state.wrong++;
    state.lives--;
    state.streak = 0;
    button.classList.add('wrong');
    const correctButton = buttons.find(btn =>
      state.current.options[state.current.correct] &&
      btn.textContent.includes(state.current.options[state.current.correct])
    );
    if (correctButton) correctButton.classList.add('correct');
    el('feedback').textContent = 'Fel svar — ett liv förlorat';
  }

  updateHud();
  setTimeout(() => {
    if (state.lives <= 0) endGame();
    else nextQuestion();
  }, 650);
}


function getScoreboard() {
  try {
    return JSON.parse(localStorage.getItem('ordUtmaningScoreboard') || '[]');
  } catch {
    return [];
  }
}

function saveScoreboard(entries) {
  localStorage.setItem('ordUtmaningScoreboard', JSON.stringify(entries));
}

function renderLeaderboard() {
  const entries = getScoreboard()
    .sort((a, b) => b.score - a.score || b.correct - a.correct || a.date.localeCompare(b.date))
    .slice(0, 10);

  const listConfigs = [
    { list: el('leaderboard-list'), editable: false },
    { list: el('start-leaderboard-list'), editable: state.editorMode }
  ].filter(item => item.list);

  listConfigs.forEach(({ list, editable }) => {
    list.innerHTML = '';

    if (entries.length === 0) {
      const item = document.createElement('li');
      item.className = 'empty-scoreboard';
      item.textContent = 'Inga sparade resultat ännu.';
      list.appendChild(item);
      return;
    }

    entries.forEach((entry, index) => {
      const item = document.createElement('li');
      const date = new Date(entry.date).toLocaleDateString('sv-SE');
      item.innerHTML = `
        <div class="score-entry-row">
          <div class="score-line-main">
            <div>
              <strong>${escapeHtml(entry.name)}</strong>
              <div class="score-meta">${entry.correct} rätt · ${entry.accuracy}% · ${date}</div>
            </div>
            <strong>${entry.score} p</strong>
          </div>
          ${editable ? `<button class="score-delete-button" data-score-index="${index}" aria-label="Ta bort resultat">✕</button>` : ''}
        </div>
      `;
      list.appendChild(item);
    });

    if (editable) {
      list.querySelectorAll('.score-delete-button').forEach(button => {
        button.addEventListener('click', () => {
          removeScore(Number(button.dataset.scoreIndex));
        });
      });
    }
  });

  el('reset-scores-start-btn')?.classList.toggle('hidden', !state.editorMode);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function saveCurrentScore() {
  if (!state.latestResult || state.scoreSaved) return;

  const name = el('player-name').value.trim();
  if (!name) {
    el('save-status').textContent = 'Skriv in ett namn först.';
    el('player-name').focus();
    return;
  }

  const entries = getScoreboard();
  entries.push({
    ...state.latestResult,
    name: name.slice(0, 20),
    date: new Date().toISOString()
  });

  saveScoreboard(entries);
  state.scoreSaved = true;
  el('save-score-btn').disabled = true;
  el('player-name').disabled = true;
  el('save-status').textContent = 'Resultatet är sparat.';
  renderLeaderboard();
}

function exitGame() {
  goToStart();
}


function removeScore(sortedIndex) {
  const sortedEntries = getScoreboard()
    .sort((a, b) => b.score - a.score || b.correct - a.correct || a.date.localeCompare(b.date))
    .slice(0, 10);

  const target = sortedEntries[sortedIndex];
  if (!target) return;

  const entries = getScoreboard();
  const originalIndex = entries.findIndex(entry =>
    entry.name === target.name &&
    entry.score === target.score &&
    entry.correct === target.correct &&
    entry.accuracy === target.accuracy &&
    entry.date === target.date
  );

  if (originalIndex >= 0) {
    entries.splice(originalIndex, 1);
    saveScoreboard(entries);
    renderLeaderboard();
  }
}

function requestEditorCode() {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'passcode-overlay';
    overlay.innerHTML = `
      <div class="passcode-dialog" role="dialog" aria-modal="true" aria-labelledby="passcode-title">
        <h2 id="passcode-title">Redigera topplistan</h2>
        <p>Ange kod för att fortsätta.</p>
        <input id="passcode-input" type="password" inputmode="numeric" maxlength="5" autocomplete="off" aria-label="Kod">
        <div class="passcode-actions">
          <button id="passcode-cancel" class="text-button">Avbryt</button>
          <button id="passcode-submit" class="secondary">Fortsätt</button>
        </div>
        <p id="passcode-error" class="save-status"></p>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#passcode-input');
    const error = overlay.querySelector('#passcode-error');

    const close = value => {
      overlay.remove();
      resolve(value);
    };

    const submit = () => {
      if (input.value === '19966') {
        close(true);
      } else {
        input.value = '';
        error.textContent = 'Fel kod.';
        input.focus();
      }
    };

    overlay.querySelector('#passcode-cancel').addEventListener('click', () => close(false));
    overlay.querySelector('#passcode-submit').addEventListener('click', submit);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') submit();
      if (event.key === 'Escape') close(false);
    });
    overlay.addEventListener('click', event => {
      if (event.target === overlay) close(false);
    });

    input.focus();
  });
}

async function enterEditorMode() {
  const allowed = await requestEditorCode();
  if (!allowed) return;

  state.editorMode = true;
  el('edit-scores-btn').textContent = 'Klar';
  renderLeaderboard();
}

function leaveEditorMode() {
  state.editorMode = false;
  el('edit-scores-btn').textContent = 'Edit';
  renderLeaderboard();
}

function toggleEditorMode() {
  if (state.editorMode) leaveEditorMode();
  else enterEditorMode();
}

function goToStart() {
  clearInterval(state.timerId);
  state.timerId = null;
  state.locked = true;
  showScreen('start');
  renderLeaderboard();
}

function startGame() {
  if (state.editorMode) leaveEditorMode();
  resetGame();
  showScreen('game');
  nextQuestion();

  state.timerId = setInterval(() => {
    state.timeLeft--;
    updateHud();
    if (state.timeLeft <= 0) endGame();
  }, 1000);
}

function endGame() {
  clearInterval(state.timerId);
  state.timerId = null;
  state.locked = true;

  const total = state.correct + state.wrong;
  const accuracy = total ? Math.round(state.correct / total * 100) : 0;
  const previousBest = Number(localStorage.getItem('hpOrdBest') || 0);
  const best = Math.max(previousBest, state.score);
  localStorage.setItem('hpOrdBest', best);

  el('final-score').textContent = state.score;
  el('final-correct').textContent = state.correct;
  el('final-wrong').textContent = state.wrong;
  el('final-accuracy').textContent = `${accuracy}%`;
  el('final-streak').textContent = state.bestStreak;
  el('best-score-text').textContent =
    state.score > previousBest ? 'Nytt personbästa!' : `Personbästa: ${best} poäng`;

  const randomResultWord =
    resultWords[Math.floor(Math.random() * resultWords.length)];
  el('result-word').textContent =
    randomResultWord.charAt(0).toUpperCase() + randomResultWord.slice(1);

  state.latestResult = {
    score: state.score,
    correct: state.correct,
    wrong: state.wrong,
    accuracy,
    bestStreak: state.bestStreak
  };
  state.scoreSaved = false;
  el('player-name').value = '';
  el('player-name').disabled = false;
  el('save-score-btn').disabled = false;
  el('save-status').textContent = '';
  renderLeaderboard();

  showScreen('result');
}

el('start-btn').addEventListener('click', startGame);
el('restart-btn').addEventListener('click', startGame);
el('exit-btn').addEventListener('click', exitGame);
el('result-back-btn').addEventListener('click', goToStart);
el('edit-scores-btn').addEventListener('click', toggleEditorMode);
el('reset-scores-start-btn').addEventListener('click', () => {
  const confirmed = window.confirm('Vill du nollställa hela topplistan?');
  if (!confirmed) return;
  localStorage.removeItem('ordUtmaningScoreboard');
  renderLeaderboard();
});
el('save-score-btn').addEventListener('click', saveCurrentScore);
el('player-name').addEventListener('keydown', event => {
  if (event.key === 'Enter') saveCurrentScore();
});
renderLeaderboard();

loadQuestions().catch(error => {
  console.error(error);
  document.body.innerHTML = `
    <main class="app-shell">
      <section class="card active">
        <h1>Kunde inte starta</h1>
        <p>Starta sidan via en lokal webbserver så att questions.json kan läsas.</p>
      </section>
    </main>`;
});
