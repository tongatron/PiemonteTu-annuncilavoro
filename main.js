/**
 * main.js — Electron main process
 * Gestisce la finestra, IPC con il renderer e le operazioni di file system.
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { downloadAllAnnunci } = require('./src/apiClient');
const { exportData } = require('./src/exporter');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 820,
    height: 780,
    minWidth: 680,
    minHeight: 600,
    resizable: true,
    title: 'Piemonte TU Exporter',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Apri DevTools solo in sviluppo
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: scegli file di destinazione ────────────────────────────────────────

ipcMain.handle('choose-save-path', async (_event, format) => {
  const ext = format === 'xlsx' ? 'xlsx' : 'csv';
  const filters =
    format === 'xlsx'
      ? [{ name: 'Excel', extensions: ['xlsx'] }]
      : [{ name: 'CSV', extensions: ['csv'] }];

  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Scegli dove salvare il file',
    defaultPath: `annunci_pslp_${dateStamp()}.${ext}`,
    filters,
  });

  if (canceled || !filePath) return null;
  return filePath;
});

// ─── IPC: avvia download ──────────────────────────────────────────────────────

ipcMain.handle('start-download', async (_event, params) => {
  const { filePath, format, requestParams, delay, cookie, recForPage } = params;

  // Callback per inviare aggiornamenti al renderer
  const onProgress = (msg) => {
    mainWindow.webContents.send('progress-update', msg);
  };

  try {
    onProgress({ type: 'info', text: 'Avvio download annunci…' });

    const allDetails = await downloadAllAnnunci(requestParams, {
      delay,
      cookie,
      recForPage,
      onProgress,
    });

    onProgress({
      type: 'info',
      text: `Download completato: ${allDetails.length} annunci recuperati. Esportazione in corso…`,
    });

    await exportData(allDetails, filePath, format);

    onProgress({
      type: 'success',
      text: `✅ File salvato: ${filePath}`,
    });

    return { ok: true, count: allDetails.length, filePath };
  } catch (err) {
    onProgress({ type: 'error', text: `❌ Errore: ${err.message}` });
    return { ok: false, error: err.message };
  }
});

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}
