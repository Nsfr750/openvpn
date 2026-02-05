const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configurazione OpenVPN
const VPN_CONFIG_PATH = process.env.VPN_CONFIG_PATH || './vpn_configs';
const VPN_MANAGEMENT_PORT = process.env.VPN_MANAGEMENT_PORT || 7505;

// Assicura che la directory delle configurazioni esista
if (!fs.existsSync(VPN_CONFIG_PATH)) {
    fs.mkdirSync(VPN_CONFIG_PATH, { recursive: true });
}

// Utility per eseguire comandi shell
function executeCommand(command, args = []) {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, stdout, stderr });
            } else {
                reject({ success: false, stdout, stderr, code });
            }
        });

        process.on('error', (error) => {
            reject({ success: false, error: error.message });
        });
    });
}

// API Routes

// Stato del servizio OpenVPN
app.get('/api/vpn/status', async (req, res) => {
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

    const configPath = path.join(VPN_CONFIG_PATH, configName);
    
    if (!fs.existsSync(configPath)) {
        return res.status(404).json({ error: 'File di configurazione non trovato' });
    }

    try {
        // Comando per avviare OpenVPN
        const args = ['--config', configPath, '--daemon'];
        
        if (username && password) {
            // Crea file temporaneo per le credenziali
            const authFile = path.join(VPN_CONFIG_PATH, `${configName}.auth`);
            fs.writeFileSync(authFile, `${username}\n${password}\n`);
            args.push('--auth-user-pass', authFile);
        }

        await executeCommand('openvpn', args);
        
        res.json({ 
            success: true, 
            message: `Connessione VPN avviata con ${configName}`,
            config: configName
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Errore durante l\'avvio della connessione VPN',
            details: error.message
        });
    }
});

// Disconnettere VPN
app.post('/api/vpn/disconnect', async (req, res) => {
    try {
        // Termina tutti i processi OpenVPN
        await executeCommand('pkill', ['-f', 'openvpn']);
        
        // Rimuovi file di autenticazione temporanei
        const authFiles = fs.readdirSync(VPN_CONFIG_PATH)
            .filter(file => file.endsWith('.auth'));
        
        authFiles.forEach(file => {
            fs.unlinkSync(path.join(VPN_CONFIG_PATH, file));
        });

        res.json({ 
            success: true, 
            message: 'Connessioni VPN terminate'
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Errore durante la disconnessione VPN',
            details: error.message
        });
    }
});

// Ottenere log della connessione
app.get('/api/vpn/logs', async (req, res) => {
    try {
        const logPath = '/var/log/openvpn.log';
        if (fs.existsSync(logPath)) {
            const logs = fs.readFileSync(logPath, 'utf8');
            res.json({ logs: logs.slice(-5000) }); // Ultimi 5000 caratteri
        } else {
            // Alternativa per Windows o altri sistemi
            const { stdout } = await executeCommand('journalctl', ['-u', 'openvpn', '--no-pager', '-n', '50']);
            res.json({ logs: stdout });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload configurazione VPN
app.post('/api/vpn/upload', (req, res) => {
    // Questo endpoint richiederebbe multer per gestire file uploads
    // Per ora, implementiamo una versione base
    res.status(501).json({ 
        message: 'Upload configurazioni non ancora implementato',
        note: 'Utilizzare la directory vpn_configs manualmente'
    });
});

// Route principale per servire l'interfaccia web
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware per gestire errori
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Errore interno del server' });
});

// Avvio del server
app.listen(PORT, () => {
    console.log(`Server OpenVPN Manager in esecuzione sulla porta ${PORT}`);
    console.log(`Interfaccia web disponibile su http://localhost:${PORT}`);
});

module.exports = app;
