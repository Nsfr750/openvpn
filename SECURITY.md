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
- **Nessuna autenticazione integrata**: l'interfaccia web non include un sistema di login. Proteggila con un reverse proxy autenticato o limita l'accesso a `localhost` se usata in produzione.

---

© Copyright 2024-2026 Nsfr750 - Tutti i diritti riservati.
