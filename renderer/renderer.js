/**
 * renderer.js — Logica UI del renderer process.
 * Comunica con il main process esclusivamente tramite window.electronAPI (preload).
 */

// ── Riferimenti DOM ────────────────────────────────────────────────────────
const elIdComune     = document.getElementById('idComune');
const elRangeKm      = document.getElementById('rangeKm');
const elTestuale     = document.getElementById('campoTestuale');
const elRecForPage   = document.getElementById('recForPage');
const elL68Art1      = document.getElementById('flgL68Art1');
const elL68Art18     = document.getElementById('flgL68Art18');
const elTirocinio    = document.getElementById('tirocinio');
const elDelay        = document.getElementById('delay');
const elCookie       = document.getElementById('cookie');
const elFilePath     = document.getElementById('filePath');
const elBtnChoose    = document.getElementById('btnChooseFile');
const elBtnStart     = document.getElementById('btnStart');
const elBtnClear     = document.getElementById('btnClear');
const elProgressBar  = document.getElementById('progressBar');
const elStatusText   = document.getElementById('statusText');
const elLog          = document.getElementById('logContainer');

// ── Stato UI ───────────────────────────────────────────────────────────────
let isRunning = false;
let savedFilePath = null;

// ── Abilita il pulsante Start solo quando il percorso file è stato scelto ──
function updateStartButton() {
  elBtnStart.disabled = isRunning || !savedFilePath;
}

// ── Selezione file di destinazione ────────────────────────────────────────
elBtnChoose.addEventListener('click', async () => {
  const format = getSelectedFormat();
  const chosen = await window.electronAPI.chooseSavePath(format);
  if (chosen) {
    savedFilePath = chosen;
    elFilePath.value = chosen;
    updateStartButton();
  }
});

// ── Avvio download ─────────────────────────────────────────────────────────
elBtnStart.addEventListener('click', async () => {
  if (isRunning || !savedFilePath) return;

  setRunning(true);
  clearLog();
  setProgress(5, 'Avvio…');

  // Rimuove vecchi listener e ne aggiunge uno nuovo
  window.electronAPI.removeProgressListeners();
  window.electronAPI.onProgressUpdate((msg) => {
    appendLog(msg.type, msg.text);
    // Aggiorna la barra di progresso in base ai messaggi
    if (msg.type === 'success') setProgress(100, msg.text);
    else if (msg.type === 'error' && msg.text.startsWith('❌ Errore:')) setProgress(0, msg.text);
  });

  const params = {
    filePath: savedFilePath,
    format: getSelectedFormat(),
    delay: parseInt(elDelay.value, 10) || 350,
    cookie: elCookie.value.trim() || null,
    recForPage: parseInt(elRecForPage.value, 10) || 100,
    requestParams: buildRequestParams(),
  };

  const result = await window.electronAPI.startDownload(params);

  if (result.ok) {
    setProgress(100, `Completato: ${result.count} annunci → ${result.filePath}`);
  } else {
    setProgress(0, `Errore: ${result.error}`);
  }

  setRunning(false);
});

// ── Pulisci log ───────────────────────────────────────────────────────────
elBtnClear.addEventListener('click', clearLog);

// ── Helpers ───────────────────────────────────────────────────────────────

function getSelectedFormat() {
  return document.querySelector('input[name="format"]:checked')?.value ?? 'xlsx';
}

function buildRequestParams() {
  return {
    flgL68Art1:          elL68Art1.checked  ? 'S' : 'N',
    flgL68Art18:         elL68Art18.checked ? 'S' : 'N',
    tirocinio:           elTirocinio.checked ? 'S' : 'N',
    idCpi:               null,
    campoTestualeRicerca: elTestuale.value.trim() || null,
    idComune:            elIdComune.value.trim() || null,
    idNazioneEstera:     null,
    rangeKm:             elRangeKm.value.trim() || '5',
  };
}

function setRunning(running) {
  isRunning = running;
  elBtnStart.disabled   = running || !savedFilePath;
  elBtnChoose.disabled  = running;
  elBtnClear.disabled   = running;
  // Disabilita tutti gli input durante l'esecuzione
  document.querySelectorAll('input').forEach((el) => {
    if (el.id !== 'filePath') el.disabled = running;
  });
}

function setProgress(pct, text) {
  elProgressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  elStatusText.textContent  = text;
}

function appendLog(type, text) {
  const line = document.createElement('span');
  line.className = `log-line ${type}`;
  line.textContent = `[${timestamp()}] ${text}`;
  elLog.appendChild(line);
  elLog.appendChild(document.createElement('br'));
  // Auto-scroll in fondo
  elLog.scrollTop = elLog.scrollHeight;
}

function clearLog() {
  elLog.innerHTML = '';
  setProgress(0, 'Pronto.');
}

function timestamp() {
  return new Date().toLocaleTimeString('it-IT');
}
