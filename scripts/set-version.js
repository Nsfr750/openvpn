#!/usr/bin/env node
// Imposta la versione dell'app in version.js e la propaga agli altri file che la riportano.
// Uso: npm run set-version -- 1.2.0
const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version || '')) {
    console.error('Uso: npm run set-version -- <x.y.z>');
    process.exit(1);
}

const root = path.resolve(__dirname, '..');

function replaceInFile(file, pattern, replacement) {
    const target = path.join(root, file);
    const content = fs.readFileSync(target, 'utf8');
    if (!pattern.test(content)) {
        throw new Error(`Versione non trovata in ${file}`);
    }
    fs.writeFileSync(target, content.replace(pattern, replacement));
}

function updateJson(file, update) {
    const target = path.join(root, file);
    const data = JSON.parse(fs.readFileSync(target, 'utf8'));
    update(data);
    fs.writeFileSync(target, JSON.stringify(data, null, 2) + '\n');
}

replaceInFile('version.js', /version: '[^']*'/, `version: '${version}'`);
updateJson('package.json', data => { data.version = version; });
updateJson('package-lock.json', data => {
    data.version = version;
    if (data.packages && data.packages['']) data.packages[''].version = version;
});
replaceInFile('Dockerfile', /ARG APP_VERSION=\S+/, `ARG APP_VERSION=${version}`);
replaceInFile('docker-compose.yml', /image: openvpn-manager:\S+/, `image: openvpn-manager:${version}`);

console.log(`Versione impostata a ${version}`);
