/**
 * exporter.js — Esporta i dati in formato CSV o XLSX.
 *
 * Dipendenze:
 *   - xlsx  (npm install xlsx)
 *   - csv-stringify (npm install csv-stringify)
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { stringify } = require('csv-stringify/sync');
const { flattenRecords } = require('./flatten');

/**
 * Esporta un array di oggetti dettaglio annuncio nel formato scelto.
 * @param {object[]} records - Dettagli annunci (possibilmente annidati)
 * @param {string} filePath - Percorso di destinazione
 * @param {'csv'|'xlsx'} format
 */
async function exportData(records, filePath, format) {
  const { headers, rows } = flattenRecords(records);

  if (format === 'xlsx') {
    await exportXlsx(headers, rows, filePath);
  } else {
    await exportCsv(headers, rows, filePath);
  }
}

/**
 * Scrive un file XLSX.
 * @param {string[]} headers
 * @param {object[]} rows
 * @param {string} filePath
 */
async function exportXlsx(headers, rows, filePath) {
  // Converte in array di array per SheetJS (più robusto di json_to_sheet con oggetti)
  const dataMatrix = [
    headers,
    ...rows.map((row) => headers.map((h) => row[h] ?? '')),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(dataMatrix);

  // Larghezza colonne automatica (stima sul contenuto)
  ws['!cols'] = headers.map((h) => ({
    wch: Math.min(
      50,
      Math.max(
        h.length,
        ...rows.slice(0, 50).map((r) => String(r[h] ?? '').length)
      )
    ),
  }));

  XLSX.utils.book_append_sheet(wb, ws, 'Annunci');
  XLSX.writeFile(wb, filePath);
}

/**
 * Scrive un file CSV (UTF-8 con BOM per compatibilità Excel italiano).
 * @param {string[]} headers
 * @param {object[]} rows
 * @param {string} filePath
 */
async function exportCsv(headers, rows, filePath) {
  const csvString = stringify(rows, {
    header: true,
    columns: headers,
    delimiter: ';', // punto e virgola: standard de-facto italiano per Excel
    cast: {
      // Forza tutti i valori a stringa per evitare problemi con valori null/boolean
      boolean: (v) => (v ? 'SI' : 'NO'),
      object: (v) => (v === null ? '' : JSON.stringify(v)),
    },
  });

  // BOM UTF-8: necessario perché Excel su Windows riconosca l'encoding
  const bom = '﻿';
  fs.writeFileSync(filePath, bom + csvString, 'utf8');
}

module.exports = { exportData };
