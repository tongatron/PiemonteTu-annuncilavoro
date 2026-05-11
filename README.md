# Piemonte TU Exporter

Applicazione desktop (Electron) per scaricare ed esportare gli annunci di lavoro attivi dal portale **PSLP Regione Piemonte** (Piemonte TU), usando esclusivamente le API JSON pubbliche del frontend — nessun scraping HTML.

---

## Cosa fa

1. Chiama `POST /annunci-pslp/consulta-annunci` per scaricare la lista degli annunci attivi, gestendo automaticamente la paginazione.
2. Estrae gli ID annuncio da ogni pagina.
3. Per ogni ID chiama `POST /annunci-pslp/get-dettaglio/{ID}` per ottenere il dettaglio completo.
4. Appiattisce i JSON annidati in colonne leggibili (es. `azienda.denominazione`, `sede.comune`).
5. Salva tutto in un file **Excel (.xlsx)** o **CSV (.csv)**.

---

## Installazione e avvio

### Prerequisiti

- [Node.js](https://nodejs.org/) ≥ 18
- npm ≥ 9

### Comandi

```bash
# 1. Entra nella cartella del progetto
cd piemonte-tu-exporter

# 2. Installa le dipendenze
npm install

# 3. Avvia l'applicazione
npm start
```

---

## Come configurare i parametri

| Campo | Descrizione | Esempio |
|---|---|---|
| **Codice Comune** | Codice catastale del comune di lavoro | `L219` (Torino) |
| **Raggio km** | Distanza massima dal comune | `5` |
| **Ricerca testuale** | Parola chiave facoltativa | `magazziniere` |
| **Record per pagina API** | Quanti annunci richiedere per ogni chiamata lista | `100` |
| **L.68 Art.1** | Filtra annunci riservati categorie protette | ✓ |
| **L.68 Art.18** | Filtra annunci L.68 Art.18 | ✗ |
| **Tirocinio** | Include annunci di tirocinio | ✗ |

### Codici comuni utili

| Comune | Codice |
|---|---|
| Torino | L219 |
| Milano | F205 |
| Genova | D969 |
| Bologna | A944 |

> Il codice è il **codice catastale** (Belfiore) del comune. Puoi trovarlo sul sito ISTAT o su Wikipedia.

---

## Come esportare CSV / XLSX

1. Scegli il **formato** (Excel o CSV) nel pannello "Opzioni di esportazione".
2. Clicca **"Scegli file…"** e indica dove salvare il file.
3. Clicca **"▶ Scarica annunci"**.
4. Attendi il completamento: il log mostra ogni ID scaricato e l'eventuale errore.
5. Il file viene creato nella posizione scelta.

**CSV**: usa `;` come separatore e UTF-8 con BOM — compatibile con Excel italiano anche facendo doppio clic.

**XLSX**: include larghezza colonne automatica e un unico foglio "Annunci".

---

## Impostazioni avanzate

### Pausa tra richieste (ms)

Default: **350 ms**. Aumenta a 500–1000 ms se il server risponde con errori `429 Too Many Requests`.

### Cookie manuale

Le API pubbliche di PSLP dovrebbero funzionare senza autenticazione. Se ottieni errori **401 Unauthorized** o **403 Forbidden**:

1. Apri il portale nel browser: `https://pslp.regione.piemonte.it`
2. Effettua il login (se richiesto).
3. Apri DevTools (F12) → tab **Network** → cerca una chiamata a `consulta-annunci`.
4. Copia il valore dell'header `Cookie` dalla richiesta.
5. Incollalo nel campo **"Cookie manuale"** nelle impostazioni avanzate.

---

## Build distribuibile

### macOS (.dmg)

```bash
npm run build:mac
```

### Windows (.exe)

```bash
npm run build:win
```

### Entrambe le piattaforme

```bash
npm run build:all
```

I file di output si trovano nella cartella `dist/`.

---

## Struttura del progetto

```
piemonte-tu-exporter/
  package.json        — dipendenze e script
  main.js             — Electron main process (finestra, IPC, dialog)
  preload.js          — bridge sicuro main↔renderer
  src/
    apiClient.js      — chiamate HTTP alle API PSLP, paginazione, retry
    exporter.js       — scrittura CSV / XLSX
    flatten.js        — appiattimento JSON annidato
  renderer/
    index.html        — interfaccia utente
    renderer.js       — logica UI
    style.css         — stile
  README.md
```

---

## Troubleshooting

### L'app non scarica nulla / risponde 0 annunci

- Verifica che il codice comune sia corretto (es. `L219` per Torino, non il nome).
- Prova a ridurre il raggio km o a cambiare i flag L68.
- Verifica la connessione internet.

### Errore 401 / 403

Il server richiede autenticazione. Segui la procedura **Cookie manuale** descritta sopra.

### Errore 429 Too Many Requests

Aumenta la **pausa tra richieste** a 500–1000 ms nelle impostazioni avanzate.

### Errore di rete / timeout

- Il portale PSLP potrebbe essere temporaneamente non disponibile.
- Prova di nuovo tra qualche minuto.
- Controlla lo stato del portale: `https://pslp.regione.piemonte.it`

### Il file Excel si apre ma i caratteri sono storti

Seleziona UTF-8 come encoding all'apertura, oppure usa il formato XLSX invece di CSV.

### Campo ID non trovato nel log

L'app logga l'avviso `⚠️ Impossibile trovare l'ID in questo record` se la struttura della risposta API cambia. Controlla il log e apri una issue con il record loggato.

---

## Note sull'uso responsabile

- Questa applicazione usa **esclusivamente le API JSON pubbliche** del portale PSLP, le stesse chiamate dal frontend ufficiale.
- Il delay configurabile evita di sovraccaricare il server.
- I dati scaricati sono ad uso personale/professionale. Non redistribuire i dati in violazione delle condizioni d'uso del portale.
- Consultare i Termini d'uso di Piemonte TU / PSLP prima di qualsiasi uso automatizzato estensivo.

---

## Licenza

MIT — vedi [LICENSE](LICENSE)
