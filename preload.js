/**
 * preload.js — Bridge sicuro tra renderer e main process.
 * Espone solo le funzioni strettamente necessarie via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Apre la dialog per scegliere dove salvare il file
  chooseSavePath: (format) => ipcRenderer.invoke('choose-save-path', format),

  // Avvia il processo di download ed esportazione
  startDownload: (params) => ipcRenderer.invoke('start-download', params),

  // Riceve aggiornamenti di progresso dal main process
  onProgressUpdate: (callback) => {
    ipcRenderer.on('progress-update', (_event, msg) => callback(msg));
  },

  // Rimuove i listener di progresso (cleanup)
  removeProgressListeners: () => {
    ipcRenderer.removeAllListeners('progress-update');
  },
});
