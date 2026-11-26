FROM node:22-alpine

# Versione dell'immagine: allineata a version.js da "npm run set-version"
ARG APP_VERSION=1.1.1
LABEL org.opencontainers.image.title="OpenVPN Manager" \
      org.opencontainers.image.version=$APP_VERSION

# OpenVPN è necessario per avviare le connessioni dal container
RUN apk add --no-cache openvpn

WORKDIR /app

# Installa solo le dipendenze di produzione
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Directory per configurazioni VPN e log (montabili come volumi)
RUN mkdir -p vpn_configs logs

EXPOSE 4000

ENV NODE_ENV=production \
    PORT=4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["node", "scripts/healthcheck.js"]

CMD ["node", "server.js"]
