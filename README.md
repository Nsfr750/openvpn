# OpenVPN Manager

Applicazione Node.js per la gestione e il controllo di connessioni OpenVPN tramite interfaccia web.

## Caratteristiche

- 🌐 Interfaccia web moderna e responsive
- 🔐 Gestione di configurazioni VPN multiple
- 📊 Monitoraggio dello stato delle connessioni
- 📋 Visualizzazione dei log di sistema
- 🔗 Connessione/disconnessione con un click
- 📱 Design mobile-friendly

## Requisiti

- Node.js 14+ 
- OpenVPN installato sul sistema
- Permessi di amministratore per gestire i processi VPN

## Installazione

1. Clona il repository:
```bash
git clone <repository-url>
cd openvpn-manager
```

2. Installa le dipendenze:
```bash
npm install
```

3. Configura le variabili d'ambiente:
```bash
cp .env.example .env
# Modifica .env secondo le tue esigenze
```

4. Crea la directory per le configurazioni VPN:
```bash
mkdir vpn_configs
```

5. Posiziona i tuoi file `.ovpn` nella directory `vpn_configs/`

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

### Interfaccia Web

1. Apri il browser e naviga su `http://localhost:4000`
2. Seleziona una configurazione VPN dal menu a tendina
3. Inserisci username e password se richiesto
4. Clicca "Connetti" per avviare la connessione VPN
5. Usa "Disconnetti" per terminare tutte le connessioni

### API Endpoints

L'applicazione espone le seguenti API REST:

- `GET /api/vpn/status` - Stato del servizio OpenVPN
- `GET /api/vpn/configs` - Lista configurazioni disponibili
- `POST /api/vpn/connect` - Avvia connessione VPN
- `POST /api/vpn/disconnect` - Termina connessioni VPN
- `GET /api/vpn/logs` - Log di sistema OpenVPN

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

```
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

### Configurazioni VPN

I file di configurazione OpenVPN (.ovpn o .conf) devono essere posizionati nella directory `vpn_configs/`. 

L'applicazione supporta:
- Autenticazione con certificati
- Autenticazione username/password
- Configurazioni multiple

## Sicurezza

- L'applicazione richiede permessi di amministratore per gestire i processi OpenVPN
- Le credenziali vengono memorizzate temporaneamente e rimosse alla disconnessione
- Si consiglia di eseguire l'applicazione in un ambiente controllato

## Troubleshooting

### Problemi Comuni

1. **"OpenVPN non trovato"**: Assicurati che OpenVPN sia installato e nel PATH di sistema
2. **"Permessi insufficienti"**: Esegui l'applicazione come amministratore
3. **"Configurazione non trovata"**: Verifica che i file .ovpn siano nella directory corretta

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
- Email: info@tuxxle.org
- GitHub: https://github.com/Nsfr750

## Contributi

I contributi sono benvenuti! Per favore:
1. Fai un fork del progetto
2. Crea un branch per la tua feature
3. Invia una pull request

---

**Nota**: Questa applicazione richiede OpenVPN installato sul sistema. Assicurati di avere i permessi necessari per gestire i processi VPN.
