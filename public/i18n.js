// Sistema di internazionalizzazione (IT/EN) per l'interfaccia web
const I18N = {
    it: {
        appTitle: '🔐 OpenVPN Manager',
        appSubtitle: 'Gestione e controllo delle connessioni VPN',
        themeToggle: 'Cambia tema',
        statusCardTitle: 'Stato del Servizio VPN',
        loadingStatus: 'Caricamento stato...',
        connectCardTitle: '📡 Connessione VPN',
        configLabel: 'Configurazione VPN:',
        selectConfigPlaceholder: 'Seleziona una configurazione...',
        loadingConfigs: 'Caricamento configurazioni...',
        usernameLabel: 'Username (opzionale):',
        usernamePlaceholder: 'Inserisci username',
        passwordLabel: 'Password (opzionale):',
        passwordPlaceholder: 'Inserisci password',
        connectBtn: '🔗 Connetti',
        disconnectBtn: '🔌 Disconnetti tutto',
        uploadLabel: 'Carica nuova configurazione:',
        uploadBtn: '⬆️ Carica',
        sysInfoTitle: '📊 Informazioni di Sistema',
        portServer: 'Porta Server:',
        statusLabel: 'Stato:',
        configsCount: 'Configurazioni:',
        connCount: 'Connessioni attive:',
        refreshBtn: '🔄 Aggiorna',
        logsBtnShow: '📋 Mostra Log',
        logsBtnHide: '📋 Nascondi Log',
        logoutBtn: '🚪 Esci',
        connectionsCardTitle: '🔌 Connessioni Attive',
        noConnections: 'Nessuna connessione attiva',
        uptimeLabel: 'Durata',
        trafficLabel: 'Dati ↓/↑',
        bandwidthCardTitle: '📈 Utilizzo Banda',
        bandwidthBtnShow: '📈 Mostra Grafico',
        bandwidthBtnHide: '📈 Nascondi Grafico',
        chartDownloadLabel: 'Download',
        chartUploadLabel: 'Upload',
        disconnectOneBtn: 'Disconnetti',
        logsCardTitle: '📋 Log di Sistema',
        loadingLogs: 'Caricamento log...',
        noLogs: 'Nessun log disponibile',
        // Stati
        stateConnected: 'Connesso',
        stateDisconnected: 'Disconnesso',
        stateUnknown: 'Sconosciuto',
        stateStatus: 'Stato:',
        stateService: 'Servizio:',
        stateError: 'Errore:',
        // Messaggi
        msgSelectConfig: 'Seleziona una configurazione VPN',
        msgConnecting: 'Connessione in corso...',
        msgDisconnecting: 'Disconnessione in corso...',
        msgConnActive: 'Connessione VPN attiva',
        msgConnTerminated: 'Connessione VPN terminata',
        msgStatusError: 'Errore nel caricamento dello stato VPN',
        msgConfigsError: 'Errore nel caricamento delle configurazioni',
        msgConnectError: 'Errore durante la connessione',
        msgDisconnectError: 'Errore durante la disconnessione',
        msgUploadNoFile: 'Seleziona un file .ovpn o .conf da caricare',
        msgUploadError: 'Errore durante il caricamento',
        msgSessionExpired: 'Sessione scaduta',
        msgCommError: 'Errore di comunicazione',
        msgLogsError: 'Errore nel caricamento dei log',
        errorPrefix: 'Errore:',
        // Login
        loginSubtitle: 'Accedi per continuare',
        loginUsername: 'Username',
        loginPassword: 'Password',
        loginBtn: 'Accedi',
        loginInvalid: 'Credenziali non valide',
        loginCommError: 'Errore di comunicazione con il server'
    },
    en: {
        appTitle: '🔐 OpenVPN Manager',
        appSubtitle: 'Manage and control your VPN connections',
        themeToggle: 'Toggle theme',
        statusCardTitle: 'VPN Service Status',
        loadingStatus: 'Loading status...',
        connectCardTitle: '📡 VPN Connection',
        configLabel: 'VPN Configuration:',
        selectConfigPlaceholder: 'Select a configuration...',
        loadingConfigs: 'Loading configurations...',
        usernameLabel: 'Username (optional):',
        usernamePlaceholder: 'Enter username',
        passwordLabel: 'Password (optional):',
        passwordPlaceholder: 'Enter password',
        connectBtn: '🔗 Connect',
        disconnectBtn: '🔌 Disconnect all',
        uploadLabel: 'Upload new configuration:',
        uploadBtn: '⬆️ Upload',
        sysInfoTitle: '📊 System Information',
        portServer: 'Server Port:',
        statusLabel: 'Status:',
        configsCount: 'Configurations:',
        connCount: 'Active connections:',
        refreshBtn: '🔄 Refresh',
        logsBtnShow: '📋 Show Logs',
        logsBtnHide: '📋 Hide Logs',
        logoutBtn: '🚪 Logout',
        connectionsCardTitle: '🔌 Active Connections',
        noConnections: 'No active connections',
        uptimeLabel: 'Uptime',
        trafficLabel: 'Data ↓/↑',
        bandwidthCardTitle: '📈 Bandwidth Usage',
        bandwidthBtnShow: '📈 Show Chart',
        bandwidthBtnHide: '📈 Hide Chart',
        chartDownloadLabel: 'Download',
        chartUploadLabel: 'Upload',
        disconnectOneBtn: 'Disconnect',
        logsCardTitle: '📋 System Logs',
        loadingLogs: 'Loading logs...',
        noLogs: 'No logs available',
        // States
        stateConnected: 'Connected',
        stateDisconnected: 'Disconnected',
        stateUnknown: 'Unknown',
        stateStatus: 'Status:',
        stateService: 'Service:',
        stateError: 'Error:',
        // Messages
        msgSelectConfig: 'Select a VPN configuration',
        msgConnecting: 'Connecting...',
        msgDisconnecting: 'Disconnecting...',
        msgConnActive: 'VPN connection active',
        msgConnTerminated: 'VPN connection terminated',
        msgStatusError: 'Error loading VPN status',
        msgConfigsError: 'Error loading configurations',
        msgConnectError: 'Connection error',
        msgDisconnectError: 'Disconnection error',
        msgUploadNoFile: 'Select a .ovpn or .conf file to upload',
        msgUploadError: 'Upload error',
        msgSessionExpired: 'Session expired',
        msgCommError: 'Communication error',
        msgLogsError: 'Error loading logs',
        errorPrefix: 'Error:',
        // Login
        loginSubtitle: 'Sign in to continue',
        loginUsername: 'Username',
        loginPassword: 'Password',
        loginBtn: 'Sign in',
        loginInvalid: 'Invalid credentials',
        loginCommError: 'Server communication error'
    }
};

let currentLang = localStorage.getItem('lang') || 'it';

function t(key) {
    return (I18N[currentLang] && I18N[currentLang][key]) || I18N.it[key] || key;
}

function applyLanguage(lang) {
    if (!I18N[lang]) lang = 'it';
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = I18N[lang][key] || I18N.it[key] || key;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = I18N[lang][key] || I18N.it[key] || key;
    });
}
