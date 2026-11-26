# OpenVPN Manager

Applicazione Node.js per la gestione e il controllo di connessioni OpenVPN tramite interfaccia web.

Versione corrente: **1.1.1** — novità e correzioni in [CHANGELOG.md](CHANGELOG.md).

## Caratteristiche

- 🌐 Interfaccia web moderna e responsive
- 🔑 Autenticazione utente con sessione (login)
- 🛡️ Rate limiting sulle API e protezione anti path traversal
- 🔐 Gestione di configurazioni VPN multiple
- ⚡ Connessioni VPN multiple simultanee con statistiche per istanza
- 📈 Grafico in tempo reale dell'utilizzo di banda (download/upload) con connessioni attive
- 🪟 Supporto Windows (OpenVPN Community, senza `--daemon`)
- 📊 Monitoraggio dello stato delle connessioni
- 📋 Visualizzazione dei log di sistema
- 🔗 Connessione/disconnessione con un click
- 🌗 Tema dark/light selezionabile
- 🌍 Interfaccia multilingua (IT/EN)
- 📖 Documentazione API interattiva (Swagger UI su `/api-docs`)
- 🐳 Supporto Docker
- 📱 Design mobile-friendly

## Requisiti

- Node.js 14+
- OpenVPN installato sul sistema (su Windows: [OpenVPN Community](https://openvpn.net/community-downloads/), non basta OpenVPN Connect)
- Permessi di amministratore per gestire i processi VPN

### Windows

Su Windows `--daemon` non è supportato: OpenVPN viene avviato come processo figlio del server e terminato
tramite interfaccia di management (o `taskkill`). L'eseguibile predefinito è
`C:\Program Files\OpenVPN\bin\openvpn.exe`; per un percorso diverso impostare `OPENVPN_BIN`.
Avviare il server da un terminale aperto come amministratore. Chiudendo il server (Ctrl+C o chiusura della finestra)
le connessioni vengono chiuse in modo pulito; con i profili UDP OpenVPN usa `--explicit-exit-notify` per avvisare
il server della disconnessione, così la riconnessione successiva non trova la vecchia sessione ancora aperta.

Senza privilegi di amministratore OpenVPN si autentica, ma Windows rifiuta l'aggiunta delle rotte
(`route addition failed ... Accesso negato`) e il traffico non passa nel tunnel.

Il file `.env` viene letto solo all'avvio: dopo ogni modifica riavviare `npm start`.

## Installazione

1. Clona il repository:

```bash
git clone <repository-url>
cd openvpn-manager
```

1. Installa le dipendenze:

```bash
npm install
```

1. Configura le variabili d'ambiente:

```bash
cp .env.example .env
# Modifica .env secondo le tue esigenze
```

1. Crea la directory per le configurazioni VPN:

```bash
mkdir vpn_configs
```

1. Posiziona i tuoi file `.ovpn` nella directory `vpn_configs/`

## Utilizzo

### Avvio del Server

Per avviare il server in modalità produzione:

```bash
npm start
```

Per sviluppo con auto-ricarica:

```bash
npm run dev
```

L'applicazione sarà disponibile su `http://localhost:4000`

### Versione

La versione dell'app è definita solo in `version.js` e viene letta da server (log di avvio),
`GET /api/version`, documentazione API e footer delle pagine web. Per cambiarla:

```bash
npm run set-version -- 1.2.0
```

Lo script aggiorna anche `package.json`, `package-lock.json`, l'`ARG APP_VERSION` del `Dockerfile`
e il tag dell'immagine in `docker-compose.yml`; un test verifica che restino allineati.

### Docker

Per eseguire l'applicazione in un container (richiede `/dev/net/tun` e la capability `NET_ADMIN`):

```bash
docker compose up -d --build
```

### Interfaccia Web

1. Apri il browser e naviga su `http://localhost:4000`
1. Seleziona una configurazione VPN dal menu a tendina
1. Inserisci username e password se richiesto
1. Clicca "Connetti" per avviare la connessione VPN
1. Usa "Disconnetti" per terminare tutte le connessioni

Con almeno una connessione attiva compare la card **Utilizzo Banda**: un grafico di download e upload
degli ultimi 2 minuti, aggiornato ogni 2 secondi, calcolato dai contatori di traffico dell'interfaccia
di management di OpenVPN (somma di tutte le connessioni). Il tasto **Mostra/Nascondi Grafico**
nella card Informazioni Sistema mostra o nasconde la card (la scelta resta salvata nel browser). Se lasci vuoti username e password,
viene usato il file `<config>.auth` salvato accanto alla configurazione.

### API Endpoints

L'applicazione espone le seguenti API REST:

- `GET /api/vpn/status` - Stato del servizio OpenVPN
- `GET /api/vpn/configs` - Lista configurazioni disponibili
- `POST /api/vpn/connect` - Avvia connessione VPN
- `POST /api/vpn/disconnect` - Termina connessioni VPN
- `GET /api/vpn/logs` - Log di sistema OpenVPN
- `GET /api/vpn/stats` - Statistiche connessione (banda, durata)
- `POST /api/vpn/upload` - Carica un file `.ovpn`/`.conf` (multipart)
- `POST /api/auth/login` - Login (sessione)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/status` - Stato autenticazione
- `GET /api/version` - Nome e versione dell'app (pubblico)

#### Esempio di utilizzo API

```javascript
// Ottenere stato VPN
fetch('/api/vpn/status')
  .then(response => response.json())
  .then(data => console.log(data));

// Connettere a una configurazione
fetch('/api/vpn/connect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    configName: 'mia-config.ovpn',
    username: 'utente',
    password: 'password'
  })
});
```

## Struttura del Progetto

```text
openvpn-manager/
├── server.js              # Server Express principale
├── package.json           # Dipendenze e script
├── .env.example          # Template configurazione
├── public/               # File statici
│   └── index.html        # Interfaccia web
├── vpn_configs/          # Directory configurazioni VPN
└── README.md            # Documentazione
```

## Configurazione

### Variabili d'Ambiente

- `PORT`: Porta del server (default: 4000)
- `VPN_CONFIG_PATH`: Percorso configurazioni VPN (default: ./vpn_configs)
- `VPN_MANAGEMENT_PORT`: Porta gestione OpenVPN (default: 7505)
- `DEBUG`: Modalità debug (default: false)
- `AUTH_ENABLED`: Abilita autenticazione interfaccia web (default: true)
- `AUTH_USERNAME`: Username per il login (default: admin)
- `AUTH_PASSWORD`: Password per il login (se vuota, generata casualmente ad ogni avvio)
- `SESSION_SECRET`: Segreto per le sessioni (impostare un valore casuale in produzione)
- `COOKIE_SECURE`: Cookie solo via HTTPS (default: false)
- `RATE_LIMIT_WINDOW_MS`: Finestra del rate limit (default: 900000)
- `RATE_LIMIT_MAX`: Richieste API max per finestra (default: 100; `GET /api/vpn/status` e `GET /api/vpn/stats` sono esclusi)
- `LOGIN_RATE_LIMIT_MAX`: Tentativi di login max per finestra (default: 10)
- `HTTPS_ENABLED`: Abilita HTTPS (default: false, richiede certificato e chiave)
- `SSL_CERT_PATH`: Percorso del certificato SSL
- `SSL_KEY_PATH`: Percorso della chiave SSL
- `LOG_DIR`: Directory dei log applicativi (default: ./logs)
- `OPENVPN_BIN`: Eseguibile di OpenVPN (default: `openvpn`; su Windows `C:\Program Files\OpenVPN\bin\openvpn.exe` se presente)
- `OPENVPN_DAEMON`: Avvia OpenVPN con `--daemon` (default: true, false su Windows)

### Configurazioni VPN

I file di configurazione OpenVPN (.ovpn o .conf) devono essere posizionati nella directory `vpn_configs/`.

L'applicazione supporta:

- Autenticazione con certificati
- Autenticazione username/password (dal form oppure da un file `<config>.auth` salvato accanto alla configurazione)
- Configurazioni multiple

## Sicurezza

- L'applicazione richiede permessi di amministratore per gestire i processi OpenVPN
- Le credenziali inserite nel form vengono scritte in `<config>.tmp-auth` (permessi `600`) e rimosse
  alla disconnessione, in caso di errore o se OpenVPN termina; il file `<config>.auth` salvato non viene mai modificato
- I file `*.auth`, `*.tmp-auth`, `.env` e `vpn_configs/` non vanno committati
- Si consiglia di eseguire l'applicazione in un ambiente controllato

Vedi anche [SECURITY.md](SECURITY.md).

## Troubleshooting

### Problemi Comuni

1. **"OpenVPN non trovato"**: Assicurati che OpenVPN sia installato e nel PATH di sistema
1. **"Permessi insufficienti"**: Esegui l'applicazione come amministratore
1. **"Configurazione non trovata"**: Verifica che i file .ovpn siano nella directory corretta
1. **"Errore durante l'avvio della connessione VPN: ..."**: il testo dopo i due punti è il motivo
   riportato da OpenVPN; il log completo è in `logs/openvpn-<config>.log`
1. **`AUTH_FAILED`**: username/password VPN rifiutati dal server (es. NAS Asustor: l'utente deve
   avere il permesso VPN in ADM)
1. **"Credenziali non valide" al login**: controlla `AUTH_USERNAME`/`AUTH_PASSWORD` in `.env` e
   riavvia il server; se `AUTH_PASSWORD` è vuota la password viene generata a ogni avvio e stampata in console
1. **`ca.crt` non trovato**: i file indicati con percorso relativo nel `.ovpn` vanno messi in `vpn_configs/`
1. **Grafico banda assente**: serve l'interfaccia di management (aggiunta automaticamente); verifica
   in `logs/app.log` che la connessione riporti `management :7505`

### Log di Debug

Per abilitare i log di debug:

```bash
DEBUG=true npm start
```

## Licenza

© Copyright 2024-2026 Nsfr750 - All rights reserved.

Questo progetto è rilasciato sotto licenza GPLv3.

## Supporto

Per segnalazioni di bug o richieste di supporto:

- Email: <info@tuxxle.org>
- GitHub: <https://github.com/Nsfr750>

## Contributi

I contributi sono benvenuti! Per favore:

1. Fai un fork del progetto
1. Crea un branch per la tua feature
1. Invia una pull request

---

**Nota**: Questa applicazione richiede OpenVPN installato sul sistema. Assicurati di avere i permessi necessari per gestire i processi VPN.
