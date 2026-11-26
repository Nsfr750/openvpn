const path = require('path');
const fs = require('fs');
const request = require('supertest');

// Configura l'ambiente PRIMA di caricare il server
const TEST_CONFIG_DIR = path.resolve(__dirname, 'vpn_configs_test');
process.env.AUTH_ENABLED = 'true';
process.env.AUTH_USERNAME = 'admin';
process.env.AUTH_PASSWORD = 'test-secret';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.VPN_CONFIG_PATH = TEST_CONFIG_DIR;
process.env.RATE_LIMIT_MAX = '100';
process.env.LOGIN_RATE_LIMIT_MAX = '200';

const app = require('../server');

async function loginAgent() {
    const agent = request.agent(app);
    await agent
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'test-secret' })
        .expect(200);
    return agent;
}

beforeAll(() => {
    if (!fs.existsSync(TEST_CONFIG_DIR)) {
        fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(TEST_CONFIG_DIR, 'test.ovpn'), 'client\n');
});

afterAll(() => {
    fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
});

describe('Autenticazione', () => {
    test('reindirizza a /login quando non autenticato', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/login');
    });

    test('serve la pagina di login', async () => {
        const res = await request(app).get('/login');
        expect(res.status).toBe(200);
        expect(res.text).toContain('login-form');
    });

    test('rifiuta credenziali non valide', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'sbagliata' });
        expect(res.status).toBe(401);
    });

    test('accetta credenziali valide e apre una sessione', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'test-secret' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.headers['set-cookie']).toBeDefined();
    });

    test('logout chiude la sessione', async () => {
        const agent = await loginAgent();
        await agent.post('/api/auth/logout').expect(200);
        const res = await agent.get('/api/vpn/configs');
        expect(res.status).toBe(401);
    });
});

describe('Protezione API', () => {
    test('blocca le API VPN senza autenticazione', async () => {
        const res = await request(app).get('/api/vpn/configs');
        expect(res.status).toBe(401);
    });

    test('permette le API VPN dopo il login', async () => {
        const agent = await loginAgent();
        const res = await agent.get('/api/vpn/configs');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.configs)).toBe(true);
        expect(res.body.configs.some(c => c.name === 'test.ovpn')).toBe(true);
    });
});

describe('Validazione nome configurazione (path traversal)', () => {
    test('rifiuta nomi con path traversal', async () => {
        const agent = await loginAgent();
        for (const configName of [
            '../server.js',
            '../../etc/passwd.ovpn',
            '..\\..\\windows\\system32.ovpn',
            'sub/dir/test.ovpn',
            'test;rm -rf.ovpn',
            'test name.ovpn',
            'test'
        ]) {
            const res = await agent
                .post('/api/vpn/connect')
                .send({ configName });
            expect(res.status).toBe(400);
        }
    });

    test('rifiuta richiesta senza configName', async () => {
        const agent = await loginAgent();
        const res = await agent.post('/api/vpn/connect').send({});
        expect(res.status).toBe(400);
    });

    test('in caso di errore restituisce il dettaglio e rimuove le credenziali', async () => {
        const agent = await loginAgent();
        fs.writeFileSync(path.join(TEST_CONFIG_DIR, 'broken.ovpn'), 'client\nopzione-inesistente 1\n');
        const res = await agent
            .post('/api/vpn/connect')
            .send({ configName: 'broken.ovpn', username: 'u', password: 'p' });
        expect(res.status).toBe(500);
        expect(typeof res.body.details).toBe('string');
        expect(res.body.details.length).toBeGreaterThan(0);
        expect(fs.existsSync(path.join(TEST_CONFIG_DIR, 'broken.ovpn.auth'))).toBe(false);
    });

    test('restituisce 404 per un nome valido ma inesistente', async () => {
        const agent = await loginAgent();
        const res = await agent
            .post('/api/vpn/connect')
            .send({ configName: 'non-esiste.ovpn' });
        expect(res.status).toBe(404);
    });
});

describe('Upload configurazioni', () => {
    test('richiede autenticazione', async () => {
        const res = await request(app)
            .post('/api/vpn/upload')
            .attach('config', Buffer.from('client\n'), 'upload.ovpn');
        expect(res.status).toBe(401);
    });

    test('carica un file .ovpn valido', async () => {
        const agent = await loginAgent();
        const res = await agent
            .post('/api/vpn/upload')
            .attach('config', Buffer.from('client\ndev tun\n'), 'nuova.ovpn');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(fs.existsSync(path.join(TEST_CONFIG_DIR, 'nuova.ovpn'))).toBe(true);
    });

    // Nota: busboy normalizza il filename con basename() lato server,
    // quindi i percorsi nei nomi file non raggiungono mai il filesystem.
    test('rifiuta estensioni non consentite', async () => {
        const agent = await loginAgent();
        for (const name of ['evil.exe', 'senza-estensione', 'evil.txt', 'evil.ovpn.exe']) {
            const res = await agent
                .post('/api/vpn/upload')
                .attach('config', Buffer.from('x'), name);
            expect(res.status).toBe(400);
        }
    });

    test('rifiuta upload duplicati', async () => {
        const agent = await loginAgent();
        const res = await agent
            .post('/api/vpn/upload')
            .attach('config', Buffer.from('client\n'), 'test.ovpn');
        expect(res.status).toBe(409);
    });

    test('rifiuta richiesta senza file', async () => {
        const agent = await loginAgent();
        const res = await agent.post('/api/vpn/upload');
        expect(res.status).toBe(400);
    });
});

describe('Statistiche connessione', () => {
    test('richiede autenticazione', async () => {
        const res = await request(app).get('/api/vpn/stats');
        expect(res.status).toBe(401);
    });

    test('restituisce le statistiche', async () => {
        const agent = await loginAgent();
        const res = await agent.get('/api/vpn/stats');
        expect(res.status).toBe(200);
        expect(res.body.stats).toBeDefined();
        expect(res.body.stats).toHaveProperty('connected');
        expect(res.body.stats).toHaveProperty('count');
        expect(res.body.stats).toHaveProperty('managementAvailable');
        expect(Array.isArray(res.body.stats.connections)).toBe(true);
    });
});

describe('Disconnessione singola istanza', () => {
    test('rifiuta nomi configurazione non validi', async () => {
        const agent = await loginAgent();
        const res = await agent
            .post('/api/vpn/disconnect')
            .send({ configName: '../evil' });
        expect(res.status).toBe(400);
    });

    test('404 se la configurazione non ha una connessione attiva', async () => {
        const agent = await loginAgent();
        const res = await agent
            .post('/api/vpn/disconnect')
            .send({ configName: 'test.ovpn' });
        expect(res.status).toBe(404);
    });
});

describe('Documentazione API', () => {
    test('reindirizza a /login quando non autenticato', async () => {
        const res = await request(app).get('/api-docs.json');
        expect(res.status).toBe(302);
    });

    test('serve la specifica OpenAPI dopo il login', async () => {
        const agent = await loginAgent();
        const res = await agent.get('/api-docs.json');
        expect(res.status).toBe(200);
        expect(res.body.openapi).toBe('3.0.3');
        expect(res.body.paths['/api/vpn/connect']).toBeDefined();
    });

    test('serve Swagger UI dopo il login', async () => {
        const agent = await loginAgent();
        const res = await agent.get('/api-docs/');
        expect(res.status).toBe(200);
    });
});

describe('Rate limiting', () => {
    test('include gli header standard di rate limit', async () => {
        const res = await request(app).get('/api/auth/status');
        expect(res.headers['ratelimit-limit']).toBeDefined();
    });

    test('restituisce 429 dopo aver superato il limite', async () => {
        process.env.RATE_LIMIT_MAX = '5';
        jest.resetModules();
        const limitedApp = require('../server');
        for (let i = 0; i < 5; i++) {
            await request(limitedApp).get('/api/auth/status');
        }
        const res = await request(limitedApp).get('/api/auth/status');
        expect(res.status).toBe(429);
    });
});
