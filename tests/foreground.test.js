const path = require('path');
const fs = require('fs');
const request = require('supertest');

// Modalità usata su Windows: OpenVPN come processo figlio, senza --daemon
const TEST_CONFIG_DIR = path.resolve(__dirname, 'vpn_configs_fg_test');
process.env.AUTH_ENABLED = 'false';
process.env.VPN_CONFIG_PATH = TEST_CONFIG_DIR;
process.env.OPENVPN_BIN = path.join(__dirname, 'fake-openvpn.js');
process.env.OPENVPN_DAEMON = 'false';
process.env.CONNECT_CHECK_DELAY_MS = '300';
process.env.VPN_MANAGEMENT_PORT = '17505';

const app = require('../server');

beforeAll(() => {
    fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    fs.writeFileSync(path.join(TEST_CONFIG_DIR, 'ok.ovpn'), 'client\nauth-user-pass\n');
    fs.writeFileSync(path.join(TEST_CONFIG_DIR, 'ok.ovpn.auth'), 'u\np\n');
    fs.writeFileSync(path.join(TEST_CONFIG_DIR, 'bad.ovpn'), 'fail\n');
});

afterAll(async () => {
    await request(app).post('/api/vpn/disconnect').send({});
    fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
});

describe('OpenVPN in primo piano (Windows)', () => {
    test('avvia senza --daemon, usa le credenziali salvate e disconnette', async () => {
        const res = await request(app).post('/api/vpn/connect').send({ configName: 'ok.ovpn' });
        expect(res.status).toBe(200);

        const args = JSON.parse(fs.readFileSync(path.join(TEST_CONFIG_DIR, 'ok.ovpn.args'), 'utf8'));
        expect(args).not.toContain('--daemon');
        expect(args[args.indexOf('--auth-user-pass') + 1]).toBe(path.join(TEST_CONFIG_DIR, 'ok.ovpn.auth'));

        const stats = await request(app).get('/api/vpn/stats');
        expect(stats.body.stats.connections.map(c => c.config)).toContain('ok.ovpn');

        const off = await request(app).post('/api/vpn/disconnect').send({ configName: 'ok.ovpn' });
        expect(off.status).toBe(200);
        expect(fs.existsSync(path.join(TEST_CONFIG_DIR, 'ok.ovpn.auth'))).toBe(true);

        const after = await request(app).get('/api/vpn/stats');
        expect(after.body.stats.count).toBe(0);
    });

    test('le credenziali del form non sovrascrivono quelle salvate e vengono rimosse', async () => {
        const saved = path.join(TEST_CONFIG_DIR, 'ok.ovpn.auth');
        const temp = path.join(TEST_CONFIG_DIR, 'ok.ovpn.tmp-auth');
        const res = await request(app).post('/api/vpn/connect')
            .send({ configName: 'ok.ovpn', username: 'form', password: 'pw' });
        expect(res.status).toBe(200);
        expect(fs.readFileSync(saved, 'utf8')).toBe('u\np\n');
        expect(fs.readFileSync(temp, 'utf8')).toBe('form\npw\n');

        // OpenVPN termina da solo dopo l'avvio: connessione e credenziali temporanee rimosse
        const args = JSON.parse(fs.readFileSync(path.join(TEST_CONFIG_DIR, 'ok.ovpn.args'), 'utf8'));
        expect(args[args.indexOf('--auth-user-pass') + 1]).toBe(temp);
        process.kill(Number(fs.readFileSync(path.join(TEST_CONFIG_DIR, 'ok.ovpn.pid'), 'utf8')), 'SIGTERM');
        await new Promise(resolve => setTimeout(resolve, 300));

        expect(fs.existsSync(temp)).toBe(false);
        expect(fs.existsSync(saved)).toBe(true);
        const stats = await request(app).get('/api/vpn/stats');
        expect(stats.body.stats.count).toBe(0);
    });

    test('se OpenVPN esce subito restituisce il suo output', async () => {
        const res = await request(app).post('/api/vpn/connect').send({ configName: 'bad.ovpn' });
        expect(res.status).toBe(500);
        expect(res.body.details).toMatch(/Options error/);

        const stats = await request(app).get('/api/vpn/stats');
        expect(stats.body.stats.count).toBe(0);
    });

    test('se l\'eseguibile non esiste lo segnala', async () => {
        jest.resetModules();
        process.env.OPENVPN_BIN = path.join(__dirname, 'non-esiste.exe');
        const app2 = require('../server');
        const res = await request(app2).post('/api/vpn/connect').send({ configName: 'ok.ovpn' });
        expect(res.status).toBe(500);
        expect(res.body.details).toMatch(/non-esiste\.exe: spawn .* ENOENT/);
    });
});
