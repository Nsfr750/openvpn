const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const crypto = require('crypto');
const net = require('net');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Configurazione OpenVPN
const VPN_CONFIG_PATH = path.resolve(process.env.VPN_CONFIG_PATH || './vpn_configs');
const VPN_MANAGEMENT_PORT = process.env.VPN_MANAGEMENT_PORT || 7505;
const CONNECT_CHECK_DELAY_MS = parseInt(process.env.CONNECT_CHECK_DELAY_MS, 10) || 1500;
const IS_WINDOWS = process.platform === 'win32';
const WINDOWS_OPENVPN_BIN = 'C:\\Program Files\\OpenVPN\\bin\\openvpn.exe';
const OPENVPN_BIN = process.env.OPENVPN_BIN ||
    (IS_WINDOWS && fs.existsSync(WINDOWS_OPENVPN_BIN) ? WINDOWS_OPENVPN_BIN : 'openvpn');
// --daemon non è supportato su Windows: lì OpenVPN gira come processo figlio del server
const OPENVPN_DAEMON = process.env.OPENVPN_DAEMON
    ? process.env.OPENVPN_DAEMON === 'true'
    : !IS_WINDOWS;
const STOP_TIMEOUT_MS = parseInt(process.env.STOP_TIMEOUT_MS, 10) || 5000;

// Configurazione autenticazione
const AUTH_ENABLED = process.env.AUTH_ENABLED !== 'false';
const AUTH_USERNAME = process.env.AUTH_USERNAME || 'admin';
let generatedPassword = null;
const AUTH_PASSWORD = process.env.AUTH_PASSWORD ||
    (AUTH_ENABLED ? (generatedPassword = crypto.randomBytes(8).toString('hex')) : null);

// Segreto di sessione (generato casualmente se non configurato)
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// Configurazione rate limiting
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX, 10) || 100;
const LOGIN_RATE_LIMIT_MAX = parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 10;

// Configurazione HTTPS
const HTTPS_ENABLED = process.env.HTTPS_ENABLED === 'true';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;

// Stato delle connessioni attive (configName -> { startedAt, mgmtPort })
const activeConnections = new Map();

// Assegna la prima porta di management libera per una nuova istanza
function nextMgmtPort() {
    const usedPorts = new Set(
        [...activeConnections.values()].map(conn => conn.mgmtPort)
    );
    let port = Number(VPN_MANAGEMENT_PORT);
    while (usedPorts.has(port)) port++;
    return port;
}

// Assicura che la directory delle configurazioni esista
if (!fs.existsSync(VPN_CONFIG_PATH)) {
    fs.mkdirSync(VPN_CONFIG_PATH, { recursive: true });
}

// Confronto a tempo costante per credenziali
function safeEqual(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// Valida il nome di un file di configurazione VPN (anti path traversal)
function isValidConfigName(name) {
    if (typeof name !== 'string') return false;
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) return false;
    if (!name.endsWith('.ovpn') && !name.endsWith('.conf')) return false;
    if (name.includes('..')) return false;
    const resolved = path.resolve(VPN_CONFIG_PATH, name);
    return resolved.startsWith(VPN_CONFIG_PATH + path.sep);
}

// Ultime righe del log di un'istanza OpenVPN (in modalità --daemon gli errori finiscono solo lì)
function readLogTail(file, lines = 15) {
    try {
        return fs.readFileSync(file, 'utf8').trim().split('\n').slice(-lines).join('\n');
    } catch {
        return '';
    }
}

// Utility per eseguire comandi shell
function executeCommand(command, args = []) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, stdout, stderr });
            } else {
                reject({ success: false, stdout, stderr, code });
            }
        });

        proc.on('error', (error) => {
            reject({ success: false, error: error.message });
        });
    });
}

// Avvia OpenVPN in primo piano come processo figlio; risolve se è ancora attivo
// dopo CONNECT_CHECK_DELAY_MS, altrimenti rifiuta con codice e output
function startForeground(args) {
    const proc = spawn(OPENVPN_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let output = '';
    const collect = (data) => { output = (output + data.toString()).slice(-5000); };
    proc.stdout.on('data', collect);
    proc.stderr.on('data', collect);

    const ready = new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, CONNECT_CHECK_DELAY_MS);
        proc.once('error', (error) => {
            clearTimeout(timer);
            reject({ error: `${OPENVPN_BIN}: ${error.message}` });
        });
        proc.once('exit', (code) => {
            clearTimeout(timer);
            reject({ stdout: output, code });
        });
    });
    return { proc, ready };
}

function removeTempAuth(conn) {
    if (conn.tempAuthFile) fs.rmSync(conn.tempAuthFile, { force: true });
}

function forceKill(proc) {
    if (IS_WINDOWS) {
        return executeCommand('taskkill', ['/PID', String(proc.pid), '/T', '/F']).catch(() => {});
    }
    proc.kill('SIGKILL');
}

// Arresta un'istanza in primo piano: SIGTERM via management (rimuove rotte e
// interfaccia), poi terminazione forzata se non esce entro STOP_TIMEOUT_MS
async function stopForeground(proc, mgmtPort) {
    if (proc.exitCode !== null || proc.signalCode !== null) return;
    const exited = new Promise(resolve => proc.once('exit', () => resolve('exit')));
    try {
        await queryManagement('signal SIGTERM', mgmtPort);
    } catch {
        if (IS_WINDOWS) await forceKill(proc); else proc.kill('SIGTERM');
    }
    let timer;
    const timeout = new Promise(resolve => { timer = setTimeout(resolve, STOP_TIMEOUT_MS, 'timeout'); });
    if (await Promise.race([exited, timeout]) === 'timeout') await forceKill(proc);
    clearTimeout(timer);
}

// Interroga l'interfaccia di management di OpenVPN
function queryManagement(command, port = Number(VPN_MANAGEMENT_PORT)) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        let data = '';
        const timer = setTimeout(() => {
            socket.destroy();
            reject(new Error('Timeout interfaccia di management'));
        }, 5000);

        socket.connect(port, '127.0.0.1', () => {
            socket.write(`${command}\nexit\n`);
        });
        socket.on('data', (chunk) => {
            data += chunk.toString();
        });
        socket.on('end', () => {
            clearTimeout(timer);
            resolve(data);
        });
        socket.on('error', (error) => {
            clearTimeout(timer);
            reject(error);
        });
    });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.COOKIE_SECURE === 'true' || HTTPS_ENABLED,
        maxAge: 8 * 60 * 60 * 1000 // 8 ore
    }
}));

// Rate limiting sulle API
const apiLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Troppe richieste, riprova più tardi' }
});
const loginLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: LOGIN_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Troppi tentativi di login, riprova più tardi' }
});
app.use('/api', apiLimiter);

// Middleware di autenticazione: protegge API e interfaccia web
const PUBLIC_PATHS = new Set(['/login', '/i18n.js', '/api/auth/login', '/api/auth/status']);
app.use((req, res, next) => {
    if (!AUTH_ENABLED) return next();
    if (PUBLIC_PATHS.has(req.path)) return next();
    if (req.session && req.session.authenticated) return next();
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Autenticazione richiesta' });
    }
    return res.redirect('/login');
});

app.use(express.static('public'));

// Documentazione API (Swagger UI)
const openapiSpec = require('./openapi');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.get('/api-docs.json', (req, res) => res.json(openapiSpec));

// Rotte di autenticazione
app.get('/login', (req, res) => {
    if (req.session && req.session.authenticated) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/auth/login', loginLimiter, (req, res) => {
    const { username, password } = req.body || {};

    const valid = safeEqual(username || '', AUTH_USERNAME) &
                  safeEqual(password || '', AUTH_PASSWORD || '');

    if (valid) {
        req.session.authenticated = true;
        req.session.username = username;
        logger.info(`Login effettuato: ${username}`);
        return res.json({ success: true });
    }
    logger.warn(`Tentativo di login fallito per utente: ${username}`);
    res.status(401).json({ error: 'Credenziali non valide' });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

app.get('/api/auth/status', (req, res) => {
    res.json({
        authEnabled: AUTH_ENABLED,
        authenticated: !AUTH_ENABLED || !!(req.session && req.session.authenticated)
    });
});

// API Routes

// Stato del servizio OpenVPN
app.get('/api/vpn/status', async (req, res) => {
    if (IS_WINDOWS) {
        try {
            const { stdout } = await executeCommand('tasklist', ['/FI', 'IMAGENAME eq openvpn.exe', '/NH']);
            const running = activeConnections.size > 0 || /openvpn\.exe/i.test(stdout);
            return res.json({ status: running ? 'active' : 'inactive', service: 'process' });
        } catch (error) {
            return res.json({ status: activeConnections.size > 0 ? 'active' : 'unknown', error: error.error });
        }
    }
    try {
        const { stdout } = await executeCommand('systemctl', ['is-active', 'openvpn']);
        res.json({ 
            status: 'active',
            service: stdout.trim()
        });
    } catch (error) {
        try {
            // Alternativa per sistemi non-systemd
            const { stdout } = await executeCommand('ps', ['aux']);
            const openvpnRunning = stdout.includes('openvpn');
            res.json({ 
                status: openvpnRunning ? 'active' : 'inactive',
                service: 'process'
            });
        } catch (fallbackError) {
            res.json({ 
                status: 'unknown',
                error: fallbackError.message
            });
        }
    }
});

// Lista delle configurazioni VPN disponibili
app.get('/api/vpn/configs', (req, res) => {
    try {
        const configs = fs.readdirSync(VPN_CONFIG_PATH)
            .filter(file => file.endsWith('.ovpn') || file.endsWith('.conf'))
            .map(file => ({
                name: file,
                path: path.join(VPN_CONFIG_PATH, file),
                size: fs.statSync(path.join(VPN_CONFIG_PATH, file)).size
            }));
        res.json({ configs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Avviare connessione VPN
app.post('/api/vpn/connect', async (req, res) => {
    const { configName, username, password } = req.body;
    
    if (!configName) {
        return res.status(400).json({ error: 'Nome configurazione richiesto' });
    }

    if (!isValidConfigName(configName)) {
        return res.status(400).json({ error: 'Nome configurazione non valido' });
    }

    const configPath = path.join(VPN_CONFIG_PATH, configName);
    
    if (!fs.existsSync(configPath)) {
        return res.status(404).json({ error: 'File di configurazione non trovato' });
    }

    if (activeConnections.has(configName)) {
        return res.status(409).json({ error: 'Connessione già attiva per questa configurazione' });
    }

    const mgmtPort = nextMgmtPort();
    const authFile = path.join(VPN_CONFIG_PATH, `${configName}.auth`);
    const vpnLog = path.join(logger.LOG_DIR, `openvpn-${configName}.log`);

    // Prenota subito nome e porta di management: richieste concorrenti non
    // riusano la stessa porta e una disconnessione durante l'avvio non viene annullata
    const connection = { startedAt: Date.now(), mgmtPort };
    activeConnections.set(configName, connection);

    try {
        // --cd prima di --config: i percorsi relativi (ca, cert, key...) sono risolti
        // rispetto alla cartella delle configurazioni
        const args = [
            '--cd', VPN_CONFIG_PATH,
            '--config', configPath,
            ...(OPENVPN_DAEMON ? ['--daemon'] : []),
            '--log', vpnLog,
            '--management', '127.0.0.1', String(mgmtPort)
        ];

        fs.rmSync(vpnLog, { force: true });
        if (username && password) {
            // File temporaneo separato: non sovrascrive le credenziali salvate in <config>.auth
            connection.tempAuthFile = path.join(VPN_CONFIG_PATH, `${configName}.tmp-auth`);
            fs.writeFileSync(connection.tempAuthFile, `${username}\n${password}\n`, { mode: 0o600 });
            args.push('--auth-user-pass', connection.tempAuthFile);
        } else if (fs.existsSync(authFile)) {
            // Credenziali salvate accanto alla configurazione (<config>.auth)
            args.push('--auth-user-pass', authFile);
        }

        if (OPENVPN_DAEMON) {
            await executeCommand(OPENVPN_BIN, args);
            // Il processo in background può terminare subito (es. permessi TUN, credenziali)
            await new Promise(resolve => setTimeout(resolve, CONNECT_CHECK_DELAY_MS));
        } else {
            const { proc, ready } = startForeground(args);
            connection.proc = proc;
            proc.once('exit', (code) => {
                if (activeConnections.get(configName) !== connection) return;
                activeConnections.delete(configName);
                removeTempAuth(connection);
                logger.warn(`Connessione VPN ${configName} terminata (codice ${code})`);
            });
            await ready;
        }
        if (/Exiting due to fatal error|SIGTERM\[soft,auth-failure\]/.test(readLogTail(vpnLog, 50))) {
            throw { message: readLogTail(vpnLog) };
        }

        logger.info(`Connessione VPN avviata con ${configName} (management :${mgmtPort})`);

        res.json({ 
            success: true, 
            message: `Connessione VPN avviata con ${configName}`,
            config: configName
        });
    } catch (error) {
        const details = error.message || error.error || readLogTail(vpnLog) ||
            (error.stderr || error.stdout || '').trim() || `openvpn terminato con codice ${error.code}`;
        if (activeConnections.get(configName) === connection) activeConnections.delete(configName);
        if (connection.proc) await stopForeground(connection.proc, mgmtPort);
        removeTempAuth(connection);
        logger.error(`Errore avvio connessione VPN (${configName}): ${details}`);
        res.status(500).json({ 
            error: 'Errore durante l\'avvio della connessione VPN',
            details
        });
    }
});

// Disconnettere VPN (una configurazione specifica oppure tutte)
app.post('/api/vpn/disconnect', async (req, res) => {
    const { configName } = req.body || {};

    try {
        if (configName) {
            // Disconnessione di una singola istanza
            if (!isValidConfigName(configName)) {
                return res.status(400).json({ error: 'Nome configurazione non valido' });
            }
            if (!activeConnections.has(configName)) {
                return res.status(404).json({ error: 'Nessuna connessione attiva per questa configurazione' });
            }
            const conn = activeConnections.get(configName);
            activeConnections.delete(configName);
            if (conn.proc) {
                await stopForeground(conn.proc, conn.mgmtPort);
            } else {
                await executeCommand('pkill', ['-f', configName]);
            }

            removeTempAuth(conn);

            logger.info(`Connessione VPN terminata: ${configName}`);
            return res.json({
                success: true,
                message: `Connessione ${configName} terminata`
            });
        }

        // Termina tutti i processi OpenVPN
        const conns = [...activeConnections.values()];
        activeConnections.clear();
        await Promise.all(conns.filter(c => c.proc).map(c => stopForeground(c.proc, c.mgmtPort)));
        if (OPENVPN_DAEMON) {
            await executeCommand('pkill', ['-f', 'openvpn']);
        }
        
        // Rimuovi i file di autenticazione temporanei (non quelli salvati dall'utente)
        conns.forEach(removeTempAuth);

        logger.info('Connessioni VPN terminate');

        res.json({ 
            success: true, 
            message: 'Connessioni VPN terminate'
        });
    } catch (error) {
        const details = error.message || error.error || (error.stderr || '').trim() ||
            `codice ${error.code}`;
        logger.error(`Errore disconnessione VPN: ${details}`);
        res.status(500).json({ 
            error: 'Errore durante la disconnessione VPN',
            details
        });
    }
});

// Ottenere log della connessione
app.get('/api/vpn/logs', async (req, res) => {
    try {
        const logPath = '/var/log/openvpn.log';
        if (IS_WINDOWS) {
            const vpnLogs = fs.readdirSync(logger.LOG_DIR)
                .filter(file => /^openvpn-.+\.log$/.test(file))
                .map(file => `== ${file} ==\n${readLogTail(path.join(logger.LOG_DIR, file), 50)}`);
            if (vpnLogs.length) return res.json({ logs: vpnLogs.join('\n\n').slice(-5000) });
            throw new Error('Nessun log OpenVPN');
        }
        if (fs.existsSync(logPath)) {
            const logs = fs.readFileSync(logPath, 'utf8');
            res.json({ logs: logs.slice(-5000) }); // Ultimi 5000 caratteri
        } else {
            // Alternativa per Windows o altri sistemi
            const { stdout } = await executeCommand('journalctl', ['-u', 'openvpn', '--no-pager', '-n', '50']);
            res.json({ logs: stdout });
        }
    } catch (error) {
        // Fallback: log dell'applicazione
        const appLog = path.join(logger.LOG_DIR, 'app.log');
        if (fs.existsSync(appLog)) {
            const logs = fs.readFileSync(appLog, 'utf8');
            return res.json({ logs: logs.slice(-5000), source: 'app' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Statistiche delle connessioni (tramite interfaccia di management)
app.get('/api/vpn/stats', async (req, res) => {
    const connections = [];

    for (const [config, conn] of activeConnections) {
        const entry = {
            config,
            mgmtPort: conn.mgmtPort,
            uptimeSeconds: Math.floor((Date.now() - conn.startedAt) / 1000),
            clients: null,
            bytesIn: null,
            bytesOut: null,
            managementAvailable: false
        };

        try {
            const output = await queryManagement('loadstats', conn.mgmtPort);
            const match = output.match(/nclients=(\d+),bytesin=(\d+),bytesout=(\d+)/);
            if (match) {
                entry.managementAvailable = true;
                entry.clients = parseInt(match[1], 10);
                entry.bytesIn = parseInt(match[2], 10);
                entry.bytesOut = parseInt(match[3], 10);
            }
        } catch (error) {
            logger.debug(`Management :${conn.mgmtPort} non disponibile: ${error.message}`);
        }

        connections.push(entry);
    }

    res.json({
        stats: {
            connected: connections.length > 0,
            count: connections.length,
            connections,
            managementAvailable: connections.some(c => c.managementAvailable)
        }
    });
});

// Upload configurazione VPN
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 512 * 1024 } // 512 KB, sufficiente per file .ovpn
});
app.post('/api/vpn/upload', upload.single('config'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nessun file ricevuto' });
    }

    const name = req.file.originalname;
    if (name !== path.basename(name) || !isValidConfigName(name)) {
        return res.status(400).json({
            error: 'Nome file non valido (consentiti solo file .ovpn o .conf)'
        });
    }

    const destPath = path.join(VPN_CONFIG_PATH, name);
    if (fs.existsSync(destPath)) {
        return res.status(409).json({ error: 'Una configurazione con questo nome esiste già' });
    }

    try {
        fs.writeFileSync(destPath, req.file.buffer);
        logger.info(`Configurazione caricata: ${name} (${req.file.size} byte)`);
        res.json({
            success: true,
            message: `Configurazione ${name} caricata`,
            name
        });
    } catch (error) {
        logger.error(`Errore salvataggio configurazione ${name}: ${error.message}`);
        res.status(500).json({ error: 'Errore durante il salvataggio del file' });
    }
});

// Route principale per servire l'interfaccia web
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware per gestire errori
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({ error: `Errore upload: ${err.message}` });
    }
    logger.error(err.stack);
    res.status(500).json({ error: 'Errore interno del server' });
});

// Avvio del server
function startServer() {
    const scheme = HTTPS_ENABLED ? 'https' : 'http';
    const onListening = () => {
        logger.info(`Server OpenVPN Manager in esecuzione sulla porta ${PORT} (${scheme.toUpperCase()})`);
        logger.info(`Interfaccia web disponibile su ${scheme}://localhost:${PORT}`);
        if (AUTH_ENABLED) {
            if (generatedPassword) {
                logger.warn('AUTH_PASSWORD non configurata.');
                logger.warn(`Password generata per questa sessione: ${generatedPassword}`);
                logger.warn('Imposta AUTH_PASSWORD nel file .env per una password persistente.');
            }
            if (!process.env.SESSION_SECRET) {
                logger.warn('SESSION_SECRET non configurato, le sessioni non sopravvivranno ai riavvii.');
            }
        } else {
            logger.warn('Autenticazione DISABILITATA (AUTH_ENABLED=false)');
        }
    };

    if (HTTPS_ENABLED) {
        if (!SSL_CERT_PATH || !SSL_KEY_PATH ||
            !fs.existsSync(SSL_CERT_PATH) || !fs.existsSync(SSL_KEY_PATH)) {
            logger.error('HTTPS abilitato ma SSL_CERT_PATH/SSL_KEY_PATH mancanti o non validi');
            process.exit(1);
        }
        const https = require('https');
        https.createServer({
            cert: fs.readFileSync(SSL_CERT_PATH),
            key: fs.readFileSync(SSL_KEY_PATH)
        }, app).listen(PORT, onListening);
    } else {
        app.listen(PORT, onListening);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = app;
