const fs = require('fs');
const path = require('path');
const request = require('supertest');

process.env.AUTH_ENABLED = 'true';
process.env.AUTH_USERNAME = 'admin';
process.env.AUTH_PASSWORD = 'test-secret';
process.env.SESSION_SECRET = 'test-session-secret';

const APP_VERSION = require('../version');
const app = require('../server');
const openapiSpec = require('../openapi');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

describe('Versione dell\'applicazione', () => {
    test('version.js contiene una versione semver', () => {
        expect(APP_VERSION.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    test('package.json, package-lock.json, Dockerfile e docker-compose.yml sono allineati a version.js', () => {
        const { version } = APP_VERSION;
        const lock = JSON.parse(read('package-lock.json'));
        expect(JSON.parse(read('package.json')).version).toBe(version);
        expect(lock.version).toBe(version);
        expect(lock.packages[''].version).toBe(version);
        expect(read('Dockerfile')).toContain(`ARG APP_VERSION=${version}`);
        expect(read('docker-compose.yml')).toContain(`image: openvpn-manager:${version}`);
    });

    test('la specifica OpenAPI usa la versione di version.js', () => {
        expect(openapiSpec.info.version).toBe(APP_VERSION.version);
    });

    test('GET /api/version è pubblico e restituisce nome e versione', async () => {
        const res = await request(app).get('/api/version').expect(200);
        expect(res.body).toEqual({ name: APP_VERSION.name, version: APP_VERSION.version });
    });

    test('lo script della versione è servito anche senza login', async () => {
        await request(app).get('/app-version.js').expect(200);
    });
});
