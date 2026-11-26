// Healthcheck del container Docker: interroga /api/version (pubblico, HTTP o HTTPS)
const https = process.env.HTTPS_ENABLED === 'true';
const client = require(https ? 'https' : 'http');

const req = client.get({
    host: '127.0.0.1',
    port: process.env.PORT || 4000,
    path: '/api/version',
    rejectUnauthorized: false,
    timeout: 4000
}, res => process.exit(res.statusCode === 200 ? 0 : 1));
req.on('timeout', () => req.destroy());
req.on('error', () => process.exit(1));
