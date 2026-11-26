#!/usr/bin/env node
// Simula openvpn in primo piano per i test: fallisce se la configurazione
// contiene "fail", altrimenti resta attivo finché non riceve SIGTERM
const fs = require('fs');
const args = process.argv.slice(2);
const config = args[args.indexOf('--config') + 1];
if (args.includes('--daemon')) {
    console.log('Options error: --daemon non atteso');
    process.exit(1);
}
if (fs.readFileSync(config, 'utf8').includes('fail')) {
    console.log('Options error: Unrecognized option or missing parameter(s)');
    process.exit(1);
}
fs.writeFileSync(`${config}.args`, JSON.stringify(args));
fs.writeFileSync(`${config}.pid`, String(process.pid));
// Interfaccia di management minima: contatori di traffico crescenti per load-stats
const mgmt = args.indexOf('--management');
if (mgmt !== -1) {
    const started = Date.now();
    require('net').createServer((socket) => {
        socket.on('data', (data) => {
            if (data.toString().includes('load-stats')) {
                const s = (Date.now() - started) / 1000;
                const bytesIn = Math.round(s * 250000 + 150000 * Math.sin(s / 3) ** 2 * s);
                const bytesOut = Math.round(s * 40000 + 30000 * Math.cos(s / 5) ** 2 * s);
                socket.write(`SUCCESS: nclients=0,bytesin=${bytesIn},bytesout=${bytesOut}\r\n`);
            }
            if (data.toString().includes('signal SIGTERM')) process.exit(0);
            if (data.toString().includes('exit')) socket.end();
        });
    }).listen(Number(args[mgmt + 2]), args[mgmt + 1]);
}
process.on('SIGTERM', () => process.exit(0));
setInterval(() => {}, 1000);
