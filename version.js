// Versione dell'applicazione: unica fonte per server, API, pagine web e Docker.
// Per cambiarla: npm run set-version -- <x.y.z> (aggiorna anche package.json,
// package-lock.json, Dockerfile e docker-compose.yml)
module.exports = {
    name: 'OpenVPN Manager',
    version: '1.1.1'
};
