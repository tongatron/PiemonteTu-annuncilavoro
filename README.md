# Piemonte TU Exporter

Scarica ed esporta gli annunci di lavoro attivi dal portale **PSLP Regione Piemonte** (Piemonte TU), usando esclusivamente le API JSON pubbliche — nessun scraping HTML.

Disponibile in due versioni:

| Versione | Requisiti | Link |
|---|---|---|
| **Web** (browser) | Nessuno — apri e usa | [tongatron.github.io/projects/piemonte-tu-exporter](https://tongatron.github.io/projects/piemonte-tu-exporter) |
| **Desktop** (Electron) | Node.js ≥ 18 | vedi sotto |

---

## Cosa fa

1. Chiama `POST /annunci-pslp/consulta-annunci` e gestisce automaticamente la paginazione.
2. Estrae tutti gli ID annuncio attivi.
3. Per ogni ID chiama `POST /annunci-pslp/get-dettaglio/{ID}` per il dettaglio completo.
4. Appiattisce i JSON annidati in colonne leggibili — inclusi gli array di oggetti come `condLavorativaOffertaList[0].idCcnl.descrCcnl`, `condLavorativaOffertaList[0].idModalitaLavoro.descrModalitaLavoro`, ecc.
5. Esporta tutto in **Excel (.xlsx)** o **CSV (.csv)**.

---

## Versione Web

Apri direttamente nel browser, senza installare nulla:

**[tongatron.github.io/projects/piemonte-tu-exporter](https://tongatron.github.io/projects/piemonte-tu-exporter)**

- Funziona su Chrome, Firefox, Edge, Safari
- Il file viene scaricato direttamente dal browser
- Le API PSLP hanno CORS aperto (`access-control-allow-origin: *`) — nessun proxy necessario
- Pulsante **[ ■ interrompi ]** per cancellare il download a metà

---

## Versione Desktop (Electron)

### Installazione e avvio da sorgente

```bash
# 1. Clona il repository
git clone https://github.com/tongatron/PiemonteTu-annuncilavoro.git
cd PiemonteTu-annuncilavoro

# 2. Installa le dipendenze
npm install

# 3. Avvia l'applicazione
npm start
```

### File distribuibili pronti

Nella cartella `dist/` trovi i binari già compilati:

| File | Piattaforma |
|---|---|
| `Piemonte TU Exporter-1.0.0-arm64.dmg` | macOS (Apple Silicon) — installatore |
| `Piemonte TU Exporter-1.0.0-arm64-mac.zip` | macOS (Apple Silicon) — zip portatile |
| `Piemonte TU Exporter Setup 1.0.0.exe` | Windows — installatore NSIS |
| `Piemonte TU Exporter 1.0.0.exe` | Windows — portable (nessuna installazione) |

> **macOS:** al primo avvio fai tasto destro → Apri per bypassare Gatekeeper (app non firmata).
> **Windows:** clicca "Ulteriori informazioni → Esegui comunque" su SmartScreen.

### Build da sorgente

```bash
npm run build:mac    # → dist/*.dmg + zip
npm run build:win    # → dist/*.exe
npm run build:all    # entrambi
```

---

## Parametri di ricerca

| Campo | Descrizione | Esempio |
|---|---|---|
| **Codice Comune** | Codice catastale Belfiore del comune di lavoro | `L219` (Torino) |
| **Raggio km** | Distanza massima dal comune | `5` |
| **Ricerca testuale** | Parola chiave facoltativa | `magazziniere` |
| **Record per pagina API** | Annunci per ogni chiamata lista | `100` |
| **L.68 Art.1** | Annunci riservati categorie protette | ✓ |
| **L.68 Art.18** | Annunci L.68 Art.18 | ✗ |
| **Tirocinio** | Include tirocini | ✗ |

### Codici comuni utili

| Comune | Codice |
|---|---|
| Torino | L219 |
| Milano | F205 |
| Genova | D969 |
| Bologna | A944 |

> Il codice catastale (Belfiore) si trova su ISTAT o Wikipedia.

---

## Export CSV / XLSX

**XLSX** — colonne con larghezza automatica, foglio "Annunci". Apri direttamente con Excel.

**CSV** — separatore `;`, encoding UTF-8 con BOM. Compatibile con Excel italiano facendo doppio clic.

### Struttura colonne (flatten JSON)

I JSON annidati vengono appiattiti con notazione dot. Gli array di oggetti vengono espansi con indice:

```
_sourceId
annuncio.condLavorativaOffertaList[0].blpTVacancy
annuncio.condLavorativaOffertaList[0].durataContratto
annuncio.condLavorativaOffertaList[0].idCcnl.descrCcnl
annuncio.condLavorativaOffertaList[0].idCcnl.settore
annuncio.condLavorativaOffertaList[0].idComuneSedeLavoro.dsComune
annuncio.condLavorativaOffertaList[0].idModalitaLavoro.descrModalitaLavoro
annuncio.condLavorativaOffertaList[0].idTipoRapportoLavoro.descrTipoRapportoLavoro
annuncio.condLavorativaOffertaList[0].ulterioriCondizioniOfferte
...
```

---

## Impostazioni avanzate

### Pausa tra richieste

Default **350 ms**. Aumenta a 500–1000 ms se ricevi errori `429 Too Many Requests`.

### Cookie manuale

Le API PSLP sono pubbliche e non richiedono autenticazione. Se ottieni **401/403**:

1. Apri `https://pslp.regione.piemonte.it` nel browser ed effettua il login.
2. DevTools (F12) → Network → cerca la chiamata `consulta-annunci`.
3. Copia l'header `Cookie` dalla richiesta.
4. Incollalo nel campo **Cookie manuale** nelle impostazioni avanzate.

> Nota: la versione web non può inviare cookie personalizzati per restrizioni di sicurezza del browser. In quel caso usa la versione desktop.

---

## Struttura del progetto

```
PiemonteTu-annuncilavoro/
  package.json          — dipendenze e script build
  main.js               — Electron main process
  preload.js            — bridge sicuro main↔renderer
  src/
    apiClient.js        — HTTP, paginazione, retry, ID detection
    exporter.js         — scrittura CSV / XLSX
    flatten.js          — appiattimento JSON annidato (inclusi array di oggetti)
  renderer/
    index.html          — UI desktop
    renderer.js         — logica UI desktop
    style.css           — tema dark
  web/
    index.html          — UI web (GitHub Pages)
    app.js              — logica web (fetch, flatten, export browser)
  dist/                 — binari compilati macOS + Windows
  README.md
```

---

## Troubleshooting

| Problema | Soluzione |
|---|---|
| 0 annunci trovati | Verifica il codice comune (es. `L219` non `Torino`). Riduci il raggio km. |
| Errore 401 / 403 | Usa il **Cookie manuale** (vedi sopra). |
| Errore 429 | Aumenta la pausa tra richieste a 500–1000 ms. |
| Timeout / rete | Il portale PSLP è temporaneamente down. Riprova tra qualche minuto. |
| Excel caratteri storti | Usa XLSX invece di CSV, oppure importa il CSV specificando UTF-8. |
| ID non trovato nel log | La struttura API è cambiata. Apri una issue con il record loggato. |

---

## Note sull'uso responsabile

- Usa esclusivamente le **API JSON pubbliche** del portale PSLP — nessun scraping.
- Il delay configurabile evita di sovraccaricare il server.
- I dati sono ad uso personale/professionale. Non redistribuire in violazione dei Termini d'uso PSLP.

---

## Licenza

MIT
