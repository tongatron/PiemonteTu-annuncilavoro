/**
 * apiClient.js — Chiamate alle API pubbliche PSLP Piemonte.
 *
 * Endpoint usati:
 *   POST /annunci-pslp/consulta-annunci?page=N&recForPage=M  → lista annunci
 *   POST /annunci-pslp/get-dettaglio/{id}                   → dettaglio singolo
 *
 * Non usa cookie Shibboleth hardcoded. Se il server richiede autenticazione,
 * passare il cookie via opzione `cookie`.
 */

const axios = require('axios');

const BASE_URL =
  'https://pslp.regione.piemonte.it/pslpbff/api-public/v1/annunci-pslp';

// Campi candidati dove può trovarsi l'ID annuncio nella risposta lista
const ID_CANDIDATE_FIELDS = [
  'idAnnuncioPslp',
  'idAnnuncio',
  'id',
  'codiceAnnuncio',
  'idOfferta',
  'announcementId',
  'idPslp',
  'idVacancy',
  'idRichiesta',
  'numAnnuncio',
  'codAnnuncio',
];

/**
 * Costruisce gli header HTTP comuni.
 * @param {string|null} cookie - Cookie opzionale per sessioni autenticate.
 */
function buildHeaders(cookie) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Origin: 'https://pslp.regione.piemonte.it',
    Referer:
      'https://pslp.regione.piemonte.it/pslpwcl/pslpfcweb/consulta-annunci/profili-ricercati',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  };
  if (cookie) headers['Cookie'] = cookie;
  return headers;
}

/**
 * Estrae l'ID annuncio da un record della lista.
 * Prova i campi candidati in ordine; logga un avviso se nessuno è trovato.
 * @param {object} record
 * @param {Function} onProgress
 * @returns {string|number|null}
 */
function extractId(record, onProgress) {
  for (const field of ID_CANDIDATE_FIELDS) {
    if (record[field] !== undefined && record[field] !== null) {
      return record[field];
    }
  }
  // Nessun campo ID trovato: logga il record per debugging
  onProgress({
    type: 'warn',
    text: `⚠️ Impossibile trovare l'ID in questo record: ${JSON.stringify(record).slice(0, 200)}`,
  });
  return null;
}

/**
 * Recupera una singola pagina di annunci.
 * @param {object} body - Parametri di ricerca
 * @param {number} page - Numero di pagina (0-based)
 * @param {number} recForPage - Record per pagina
 * @param {string|null} cookie
 * @returns {Promise<object>} - Risposta grezza del server
 */
async function fetchPage(body, page, recForPage, cookie) {
  const url = `${BASE_URL}/consulta-annunci?page=${page}&recForPage=${recForPage}`;
  const response = await axios.post(url, body, {
    headers: buildHeaders(cookie),
    timeout: 30000,
  });
  return response.data;
}

/**
 * Recupera il dettaglio di un singolo annuncio con retry automatico.
 * @param {string|number} id
 * @param {string|null} cookie
 * @param {number} retries - Tentativi massimi
 * @returns {Promise<object>}
 */
async function fetchDetail(id, cookie, retries = 3) {
  const url = `${BASE_URL}/get-dettaglio/${id}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(url, {}, {
        headers: buildHeaders(cookie),
        timeout: 30000,
      });
      return response.data;
    } catch (err) {
      if (attempt === retries) throw err;
      // Attesa esponenziale prima di riprovare
      await sleep(500 * attempt);
    }
  }
}

/**
 * Interpreta la struttura di risposta della lista per ricavare:
 *   - l'array di record
 *   - se esistono altre pagine
 *
 * I backend Spring Boot restituiscono tipicamente:
 *   { content: [...], totalPages: N, totalElements: N, last: bool }
 * oppure l'array direttamente, o wrapped in { data: [...] } ecc.
 *
 * @param {any} responseData
 * @param {number} recForPage
 * @returns {{ records: object[], hasMore: boolean, totalPages: number|null }}
 */
function parseListResponse(responseData, recForPage) {
  // Caso 1: Spring Pageable standard { content: [], totalPages: N, last: bool }
  if (responseData && Array.isArray(responseData.content)) {
    return {
      records: responseData.content,
      hasMore: !responseData.last,
      totalPages: responseData.totalPages ?? null,
    };
  }

  // Caso 2: array diretto
  if (Array.isArray(responseData)) {
    return {
      records: responseData,
      hasMore: responseData.length >= recForPage,
      totalPages: null,
    };
  }

  // Caso 3: { data: [], ... }
  if (responseData && Array.isArray(responseData.data)) {
    return {
      records: responseData.data,
      hasMore: responseData.data.length >= recForPage,
      totalPages: null,
    };
  }

  // Caso 4: { annunci: [], ... }
  if (responseData && Array.isArray(responseData.annunci)) {
    return {
      records: responseData.annunci,
      hasMore: responseData.annunci.length >= recForPage,
      totalPages: null,
    };
  }

  // Caso 5: { result: [], ... }
  if (responseData && Array.isArray(responseData.result)) {
    return {
      records: responseData.result,
      hasMore: responseData.result.length >= recForPage,
      totalPages: null,
    };
  }

  // Caso 6: PSLP proprietario { list: [], currentPage: N, esitoPositivo: bool, totalPage?: N }
  if (responseData && Array.isArray(responseData.list)) {
    const tp = responseData.totalPage ?? responseData.totalPages ?? null;
    const currentPage = responseData.currentPage ?? 0;
    const hasMore = tp !== null
      ? currentPage + 1 < tp
      : responseData.list.length >= recForPage;
    return {
      records: responseData.list,
      hasMore,
      totalPages: tp,
    };
  }

  // Risposta non riconosciuta
  throw new Error(
    `Struttura risposta non riconosciuta: ${JSON.stringify(responseData).slice(0, 300)}`
  );
}

/**
 * Scarica tutti gli annunci (tutte le pagine) e i loro dettagli.
 *
 * @param {object} requestParams - Parametri di ricerca (idComune, rangeKm, ecc.)
 * @param {object} options
 * @param {number} options.delay - Millisecondi di pausa tra una richiesta e l'altra
 * @param {string|null} options.cookie - Cookie opzionale
 * @param {number} options.recForPage - Record per pagina
 * @param {Function} options.onProgress - Callback per log/progresso
 * @returns {Promise<object[]>} - Array di oggetti dettaglio annuncio
 */
async function downloadAllAnnunci(requestParams, options) {
  const { delay = 350, cookie = null, recForPage = 100, onProgress } = options;

  // ── Fase 1: raccoglie tutti gli ID da tutte le pagine ──────────────────────
  const allIds = [];
  let page = 0;
  let hasMore = true;
  let totalPages = null;

  while (hasMore) {
    onProgress({
      type: 'info',
      text: `📄 Recupero pagina lista ${page + 1}${totalPages ? '/' + totalPages : ''}…`,
    });

    let rawResponse;
    try {
      rawResponse = await fetchPage(requestParams, page, recForPage, cookie);
    } catch (err) {
      throw new Error(`Errore nel recupero della pagina ${page}: ${err.message}`);
    }

    const { records, hasMore: more, totalPages: tp } = parseListResponse(
      rawResponse,
      recForPage
    );

    if (tp !== null) totalPages = tp;

    onProgress({
      type: 'info',
      text: `  → ${records.length} annunci in pagina ${page + 1}`,
    });

    for (const record of records) {
      const id = extractId(record, onProgress);
      if (id !== null) allIds.push(id);
    }

    hasMore = more && records.length > 0;
    page++;

    if (hasMore) await sleep(delay);
  }

  onProgress({
    type: 'info',
    text: `✅ Lista completata: trovati ${allIds.length} ID univoci. Avvio download dettagli…`,
  });

  if (allIds.length === 0) {
    throw new Error(
      'Nessun annuncio trovato. Verifica i parametri di ricerca o che l\'API sia accessibile.'
    );
  }

  // ── Fase 2: scarica il dettaglio per ogni ID ───────────────────────────────
  const allDetails = [];
  let errorCount = 0;

  for (let i = 0; i < allIds.length; i++) {
    const id = allIds[i];
    onProgress({
      type: 'info',
      text: `🔍 [${i + 1}/${allIds.length}] Dettaglio annuncio ID ${id}…`,
    });

    try {
      const detail = await fetchDetail(id, cookie);
      // Conserva sempre l'ID sorgente per riferimento
      allDetails.push({ _sourceId: id, ...detail });
    } catch (err) {
      errorCount++;
      onProgress({
        type: 'error',
        text: `  ❌ Errore ID ${id}: ${err.message}`,
      });
      // Inserisce un record segnaposto così non si perde la traccia dell'ID
      allDetails.push({
        _sourceId: id,
        _error: err.message,
      });
    }

    if (i < allIds.length - 1) await sleep(delay);
  }

  if (errorCount > 0) {
    onProgress({
      type: 'warn',
      text: `⚠️ Completato con ${errorCount} errori su ${allIds.length} annunci.`,
    });
  }

  return allDetails;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { downloadAllAnnunci };
