/**
 * renderer.js — Logica UI dark/hacker theme.
 */

// ── DOM refs ───────────────────────────────────────────────────────────────
const elIdComune    = document.getElementById('idComune');
const elRangeKm     = document.getElementById('rangeKm');
const elTestuale    = document.getElementById('campoTestuale');
const elRecForPage  = document.getElementById('recForPage');
const elL68Art1     = document.getElementById('flgL68Art1');
const elL68Art18    = document.getElementById('flgL68Art18');
const elTirocinio   = document.getElementById('tirocinio');
const elDelay       = document.getElementById('delay');
const elCookie      = document.getElementById('cookie');
const elFilePath    = document.getElementById('filePath');
const elBtnChoose   = document.getElementById('btnChooseFile');
const elBtnStart    = document.getElementById('btnStart');
const elBtnClear    = document.getElementById('btnClear');
const elProgressBar = document.getElementById('progressBar');
const elProgressPct = document.getElementById('progressPct');
const elStatusText  = document.getElementById('statusText');
const elLog         = document.getElementById('logContainer');
const elStatusDot   = document.getElementById('statusDot');

// ── Stato ──────────────────────────────────────────────────────────────────
let isRunning     = false;
let savedFilePath = null;
let totalItems    = 0;
let doneItems     = 0;

// ── Radio formato stilizzati ───────────────────────────────────────────────
document.querySelectorAll('.radio-label').forEach((lbl) => {
  lbl.addEventListener('click', () => {
    document.querySelectorAll('.radio-label').forEach((l) => l.classList.remove('selected'));
    lbl.classList.add('selected');
    lbl.querySelector('input').checked = true;
  });
});

// ── Checkbox stilizzati ────────────────────────────────────────────────────
[
  { cb: elL68Art1,  lbl: document.getElementById('lbl-l68art1')  },
  { cb: elL68Art18, lbl: document.getElementById('lbl-l68art18') },
  { cb: elTirocinio,lbl: document.getElementById('lbl-tirocinio') },
].forEach(({ cb, lbl }) => {
  const sync = () => lbl.classList.toggle('checked', cb.checked);
  cb.addEventListener('change', sync);
  sync();
});

// ── Toggle sezione avanzate ────────────────────────────────────────────────
document.getElementById('advancedToggle').addEventListener('click', () => {
  document.getElementById('advancedSection').classList.toggle('open');
});

// ── Scelta file destinazione ───────────────────────────────────────────────
elBtnChoose.addEventListener('click', async () => {
  const format = getFormat();
  const chosen = await window.electronAPI.chooseSavePath(format);
  if (chosen) {
    savedFilePath = chosen;
    elFilePath.value = chosen;
    updateStartBtn();
  }
});

// ── Avvio download ─────────────────────────────────────────────────────────
elBtnStart.addEventListener('click', async () => {
  if (isRunning || !savedFilePath) return;

  setRunning(true);
  clearLog();
  setProgress(0, '_ avvio…');
  totalItems = 0;
  doneItems  = 0;

  window.electronAPI.removeProgressListeners();
  window.electronAPI.onProgressUpdate((msg) => {
    appendLog(msg.type, msg.text);

    // Stima progresso: conta i messaggi "Dettaglio annuncio"
    if (msg.text.includes('trovati') && msg.text.includes('ID')) {
      const m = msg.text.match(/trovati\s+(\d+)/);
      if (m) totalItems = parseInt(m[1], 10);
      setProgress(10, msg.text);
    } else if (msg.text.includes('Dettaglio annuncio ID')) {
      doneItems++;
      const pct = totalItems > 0 ? 10 + Math.round((doneItems / totalItems) * 88) : 50;
      setProgress(pct, `_ ${doneItems}/${totalItems || '?'} annunci`);
    } else if (msg.type === 'success') {
      setProgress(100, msg.text);
    }
  });

  const result = await window.electronAPI.startDownload({
    filePath:      savedFilePath,
    format:        getFormat(),
    delay:         parseInt(elDelay.value, 10) || 350,
    cookie:        elCookie.value.trim() || null,
    recForPage:    parseInt(elRecForPage.value, 10) || 100,
    requestParams: buildParams(),
  });

  if (result.ok) {
    setProgress(100, `✓ ${result.count} annunci → ${result.filePath}`);
  } else {
    setProgress(0, `✗ ${result.error}`);
  }

  setRunning(false);
});

// ── Pulisci log ────────────────────────────────────────────────────────────
elBtnClear.addEventListener('click', clearLog);

// ── Helpers ────────────────────────────────────────────────────────────────

function getFormat() {
  return document.querySelector('input[name="format"]:checked')?.value ?? 'xlsx';
}

function buildParams() {
  return {
    flgL68Art1:           elL68Art1.checked  ? 'S' : 'N',
    flgL68Art18:          elL68Art18.checked ? 'S' : 'N',
    tirocinio:            elTirocinio.checked ? 'S' : 'N',
    idCpi:                null,
    campoTestualeRicerca: elTestuale.value.trim() || null,
    idComune:             elIdComune.value.trim() || null,
    idNazioneEstera:      null,
    rangeKm:              elRangeKm.value.trim() || '5',
  };
}

function updateStartBtn() {
  elBtnStart.disabled = isRunning || !savedFilePath;
}

function setRunning(running) {
  isRunning = running;
  updateStartBtn();
  elBtnChoose.disabled = running;
  document.querySelectorAll('input:not(#filePath)').forEach((el) => {
    el.disabled = running;
  });

  // Dot di stato
  elStatusDot.className = 'dot ' + (running ? 'running' : 'idle');
}

function setProgress(pct, text) {
  const clamped = Math.max(0, Math.min(100, pct));
  elProgressBar.style.width = clamped + '%';
  elProgressPct.textContent = clamped + '%';
  elStatusText.textContent  = '_ ' + text.replace(/^[_✓✗]\s*/, '');
}

function appendLog(type, text) {
  const line = document.createElement('span');
  line.className = `log-line ${type}`;
  line.textContent = `[${ts()}] ${text}`;
  elLog.appendChild(line);
  elLog.appendChild(document.createElement('br'));
  elLog.scrollTop = elLog.scrollHeight;
}

function clearLog() {
  elLog.innerHTML = '';
  setProgress(0, 'pronto.');
  elStatusDot.className = 'dot idle';
}

function ts() {
  return new Date().toLocaleTimeString('it-IT');
}
