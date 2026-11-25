const path = require('path');
const fs = require('fs');
const winston = require('winston');

const LOG_DIR = path.resolve(process.env.LOG_DIR || './logs');

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logger = winston.createLogger({
    level: process.env.DEBUG === 'true' ? 'debug' : 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, stack }) =>
            `${timestamp} [${level.toUpperCase()}] ${stack || message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'app.log'),
            maxsize: 5 * 1024 * 1024, // 5 MB per file
            maxFiles: 5,              // mantiene gli ultimi 5 file ruotati
            tailable: true
        })
    ]
});

module.exports = logger;
module.exports.LOG_DIR = LOG_DIR;
