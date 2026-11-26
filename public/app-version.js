// Mostra nome e versione dell'app (da /api/version) negli elementi con l'attributo data-app-version
fetch('/api/version')
    .then(res => (res.ok ? res.json() : null))
    .then(info => {
        if (!info) return;
        document.querySelectorAll('[data-app-version]').forEach(el => {
            el.textContent = `${info.name} v${info.version}`;
        });
    })
    .catch(() => {});
