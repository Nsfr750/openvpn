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
process.on('SIGTERM', () => process.exit(0));
setInterval(() => {}, 1000);
