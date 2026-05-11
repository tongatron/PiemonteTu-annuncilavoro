/**
 * flatten.js — Appiattisce oggetti JSON annidati in un dizionario piatto.
 *
 * Esempio:
 *   { azienda: { denominazione: "ACME", sede: { comune: "Torino" } } }
 *   →
 *   { "azienda.denominazione": "ACME", "azienda.sede.comune": "Torino" }
 *
 * Gli array vengono serializzati come stringa JSON per non perdere dati.
 */

/**
 * Appiattisce ricorsivamente un oggetto.
 * @param {any} obj - L'oggetto da appiattire
 * @param {string} prefix - Prefisso corrente (per ricorsione)
 * @param {object} result - Accumulatore
 * @returns {object}
 */
function flattenObject(obj, prefix = '', result = {}) {
  if (obj === null || obj === undefined) {
    result[prefix] = '';
    return result;
  }

  if (typeof obj !== 'object') {
    result[prefix] = obj;
    return result;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      result[prefix] = '';
      return result;
    }
    // Array di primitive → unisce con virgola in una sola cella
    if (obj.every((el) => typeof el !== 'object' || el === null)) {
      result[prefix] = obj.join(', ');
      return result;
    }
    // Array di oggetti → espande ogni elemento con indice [0], [1]…
    for (let i = 0; i < obj.length; i++) {
      flattenObject(obj[i], prefix ? `${prefix}[${i}]` : `[${i}]`, result);
    }
    return result;
  }

  // Oggetto: ricorsione su ogni chiave
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    result[prefix] = '';
    return result;
  }

  for (const key of keys) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    flattenObject(obj[key], newKey, result);
  }

  return result;
}

/**
 * Appiattisce un array di oggetti e ricava le intestazioni colonna unione.
 * @param {object[]} records
 * @returns {{ headers: string[], rows: object[] }}
 */
function flattenRecords(records) {
  const flatRows = records.map((r) => flattenObject(r));

  // Raccoglie tutte le chiavi distinte mantenendo l'ordine di apparizione
  const headerSet = new Set();
  for (const row of flatRows) {
    for (const key of Object.keys(row)) {
      headerSet.add(key);
    }
  }

  const headers = Array.from(headerSet);

  // Normalizza ogni riga: aggiunge stringa vuota per le colonne mancanti
  const rows = flatRows.map((row) => {
    const normalized = {};
    for (const h of headers) {
      normalized[h] = row[h] !== undefined ? row[h] : '';
    }
    return normalized;
  });

  return { headers, rows };
}

module.exports = { flattenObject, flattenRecords };
