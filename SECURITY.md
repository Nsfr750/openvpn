# Politica di Sicurezza

## Versioni Supportate

Le seguenti versioni di OpenVPN Manager ricevono attualmente aggiornamenti di sicurezza:

| Versione | Supportata          |
| -------- | ------------------- |
| 1.0.x    | :white_check_mark:  |

## Segnalazione di una Vulnerabilità

Se scopri una vulnerabilità di sicurezza in questo progetto, **non aprire una issue pubblica**.

Segnala la vulnerabilità in modo riservato inviando un'email a:

**info@tuxxle.org**

Includi nella segnalazione:

- Una descrizione della vulnerabilità
- I passi per riprodurre il problema
- L'impatto potenziale
- Eventuali suggerimenti per la risoluzione (se disponibili)

### Cosa aspettarsi

- Riceverai una conferma di ricezione entro 72 ore
- Verrai aggiornato sullo stato di avanzamento della risoluzione
- Una volta risolta, la vulnerabilità sarà documentata nel changelog (se appropriato, con credito al segnalatore)

## Note sulla Sicurezza

Questa applicazione gestisce connessioni VPN e richiede attenzione particolare:

- **File `.ovpn`**: possono contenere credenziali sensibili. La directory `vpn_configs/` è esclusa dal controllo di versione — non committare mai file di configurazione VPN.
- **File `.env`**: contiene variabili d'ambiente potenzialmente sensibili. Usa sempre `.env.example` come modello senza valori reali.
- **Interfaccia di management OpenVPN**: la porta di management (default `7505`) deve essere raggiungibile solo da localhost. Non esporla su reti pubbliche.
- **Permessi di amministratore**: l'applicazione esegue processi OpenVPN con privilegi elevati. Eseguila solo in ambienti fidati e non esporla su reti non protette senza autenticazione.
- **Autenticazione**: l'interfaccia web e le API richiedono il login (`AUTH_USERNAME`/`AUTH_PASSWORD`). Imposta una password robusta e un `SESSION_SECRET` casuale; se `AUTH_PASSWORD` è vuota viene generata una password casuale a ogni avvio. Non disabilitare `AUTH_ENABLED` se il server è raggiungibile da altri host, e usa HTTPS (`HTTPS_ENABLED`) fuori da `localhost`.
- **Rate limiting**: le API sono limitate (`RATE_LIMIT_MAX`) e il login ha un limite più stretto (`LOGIN_RATE_LIMIT_MAX`). `GET /api/vpn/status` e `GET /api/vpn/stats` sono esclusi perché interrogati di continuo dall'interfaccia, ma restano accessibili solo dopo il login.
- **File di credenziali**: `<config>.auth` contiene username e password VPN in chiaro; le credenziali del form vengono scritte in `<config>.tmp-auth` (permessi `600`) e cancellate alla disconnessione. Entrambi sono esclusi da git (`*.auth`, `*.tmp-auth`): se sono stati pubblicati per errore, rimuovili dalla history e cambia la password.
- **Upload**: sono accettati solo `.ovpn`/`.conf` fino a 512 KB; il nome viene normalizzato e validato contro il path traversal. Un file `.ovpn` può contenere direttive che eseguono script (`up`, `down`, `script-security`): carica solo configurazioni di fonti fidate.
- **Windows**: il server va avviato come amministratore per creare l'interfaccia TAP e aggiungere le rotte; tutti i processi OpenVPN avviati ereditano questi privilegi.

---

© Copyright 2024-2026 Nsfr750 - Tutti i diritti riservati.
