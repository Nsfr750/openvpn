# Changelog

Tutte le modifiche notevoli a questo progetto saranno documentate in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.0.0/),
e questo progetto aderisce al [Semantic Versioning 2.0.0](https://semver.org/lang/it/).

## [Unreleased]

### Aggiunto

- Autenticazione per l'interfaccia web tramite sessione (login utente) con `express-session`
- Pagina di login (`/login`) e endpoint `/api/auth/login`, `/api/auth/logout`, `/api/auth/status`
- Rate limiting sulle API con `express-rate-limit` (limite più restrittivo per il login)
- Test automatizzati con Jest e Supertest (`tests/api.test.js`)
- Nuove variabili d'ambiente: `AUTH_ENABLED`, `AUTH_USERNAME`, `AUTH_PASSWORD`, `SESSION_SECRET`, `COOKIE_SECURE`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `LOGIN_RATE_LIMIT_MAX`
- Upload di file `.ovpn`/`.conf` tramite interfaccia web (endpoint `/api/vpn/upload`, multer)
- Statistiche di connessione tramite interfaccia di management OpenVPN (endpoint `/api/vpn/stats`: banda, durata, client)
- Grafico in tempo reale dell'utilizzo di banda (download/upload, ultimi 2 minuti) visibile con connessioni attive; le statistiche si aggiornano ogni 2 s
- Notifiche toast nell'interfaccia quando lo stato della connessione cambia
- Supporto HTTPS per il server web (`HTTPS_ENABLED`, `SSL_CERT_PATH`, `SSL_KEY_PATH`)
- Logging su file con rotazione tramite winston (`logs/app.log`, `LOG_DIR`)
- Modalità dark/light selezionabile (persistente via localStorage, rispetta `prefers-color-scheme`)
- Internazionalizzazione dell'interfaccia web (IT/EN, `public/i18n.js`)
- Supporto per più istanze OpenVPN simultanee (porta di management dedicata per istanza, disconnessione selettiva)
- Documentazione API con Swagger UI su `/api-docs` e specifica OpenAPI 3.0 su `/api-docs.json`
- Dockerfile e docker-compose.yml per il deploy in container (richiede `NET_ADMIN` e `/dev/net/tun`)

### Corretto

- Le statistiche di traffico erano sempre vuote: il comando di management inviato era `loadstats` invece di `load-stats`
- Avvio connessione VPN: l'errore restituito ora include il motivo reale (output/log di OpenVPN) invece di `undefined`; il log di ogni istanza è scritto in `logs/openvpn-<config>.log`
- I percorsi relativi nei file `.ovpn` (`ca`, `cert`, `key`, ...) sono risolti rispetto alla cartella delle configurazioni (`--cd`)
- Supporto Windows: OpenVPN avviato come processo figlio senza `--daemon`, arresto via management o `taskkill`, stato con `tasklist`; eseguibile configurabile con `OPENVPN_BIN` (`OPENVPN_DAEMON` per forzare la modalità)
- Se il form non contiene credenziali viene usato il file `<config>.auth` salvato accanto alla configurazione; la disconnessione non lo cancella più
- Un'istanza OpenVPN che termina subito dopo l'avvio (es. permessi TUN, credenziali errate) viene segnalata come errore invece che come connessione riuscita

### Sicurezza

- Validazione e sanitizzazione dei nomi dei file `.ovpn` per prevenire path traversal
- Validazione dei file caricati (estensione, dimensione max 512 KB, nessun path nel nome)
- Confronto a tempo costante delle credenziali di login
- Tutte le API `/api/vpn/*` e l'interfaccia web richiedono autenticazione (disattivabile con `AUTH_ENABLED=false`)
- `vpn_configs/` e `*.auth` aggiunti a `.gitignore` (evita il commit di credenziali VPN)

## [1.0.0] - 2026-01-19

### Aggiunto

- Interfaccia web moderna e responsive per la gestione di OpenVPN
- Gestione di configurazioni VPN multiple (file `.ovpn` nella directory `vpn_configs/`)
- Connessione e disconnessione VPN con un click
- Monitoraggio dello stato delle connessioni tramite interfaccia di management OpenVPN
- Visualizzazione dei log di sistema
- Supporto per variabili d'ambiente tramite `dotenv` (`.env`, `.env.example`)
- Script `npm start` e `npm run dev` (con nodemon) per l'avvio del server
- Design mobile-friendly

### Sicurezza

- Directory `vpn_configs/` e file `.env` esclusi dal controllo di versione tramite `.gitignore`

[1.0.0]: https://github.com/Nsfr750/openvpn-manager/releases/tag/v1.0.0
