FROM node:22-alpine

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

CMD ["node", "server.js"]
