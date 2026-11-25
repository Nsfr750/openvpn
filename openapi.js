// Specifica OpenAPI 3.0 per l'API di OpenVPN Manager
module.exports = {
    openapi: '3.0.3',
    info: {
        title: 'OpenVPN Manager API',
        version: '1.0.0',
        description: 'API REST per la gestione e il controllo di connessioni OpenVPN',
        license: { name: 'GPLv3' },
        contact: { name: 'Nsfr750', url: 'https://github.com/Nsfr750' }
    },
    servers: [{ url: '/', description: 'Server corrente' }],
    components: {
        securitySchemes: {
            sessionCookie: {
                type: 'apiKey',
                in: 'cookie',
                name: 'connect.sid'
            }
        },
        schemas: {
            Error: {
                type: 'object',
                properties: { error: { type: 'string' } }
            },
            ConnectRequest: {
                type: 'object',
                required: ['configName'],
                properties: {
                    configName: { type: 'string', example: 'mia-config.ovpn' },
                    username: { type: 'string' },
                    password: { type: 'string' }
                }
            }
        }
    },
    security: [{ sessionCookie: [] }],
    paths: {
        '/api/auth/login': {
            post: {
                tags: ['Autenticazione'],
                summary: 'Effettua il login e apre una sessione',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['username', 'password'],
                                properties: {
                                    username: { type: 'string' },
                                    password: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Login riuscito' },
                    401: { description: 'Credenziali non valide' },
                    429: { description: 'Troppi tentativi di login' }
                }
            }
        },
        '/api/auth/logout': {
            post: {
                tags: ['Autenticazione'],
                summary: 'Termina la sessione corrente',
                responses: { 200: { description: 'Logout effettuato' } }
            }
        },
        '/api/auth/status': {
            get: {
                tags: ['Autenticazione'],
                summary: 'Stato dell\'autenticazione',
                security: [],
                responses: {
                    200: {
                        description: 'Stato autenticazione',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        authEnabled: { type: 'boolean' },
                                        authenticated: { type: 'boolean' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/vpn/status': {
            get: {
                tags: ['VPN'],
                summary: 'Stato del servizio OpenVPN',
                responses: {
                    200: {
                        description: 'Stato del servizio',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', enum: ['active', 'inactive', 'unknown'] },
                                        service: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    401: { description: 'Autenticazione richiesta' }
                }
            }
        },
        '/api/vpn/configs': {
            get: {
                tags: ['VPN'],
                summary: 'Lista delle configurazioni VPN disponibili',
                responses: {
                    200: {
                        description: 'Lista configurazioni',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        configs: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    path: { type: 'string' },
                                                    size: { type: 'integer' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    401: { description: 'Autenticazione richiesta' }
                }
            }
        },
        '/api/vpn/connect': {
            post: {
                tags: ['VPN'],
                summary: 'Avvia una connessione VPN',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': { schema: { $ref: '#/components/schemas/ConnectRequest' } }
                    }
                },
                responses: {
                    200: { description: 'Connessione avviata' },
                    400: { description: 'Nome configurazione mancante o non valido' },
                    401: { description: 'Autenticazione richiesta' },
                    404: { description: 'File di configurazione non trovato' },
                    409: { description: 'Connessione già attiva per questa configurazione' },
                    500: { description: 'Errore durante l\'avvio' }
                }
            }
        },
        '/api/vpn/disconnect': {
            post: {
                tags: ['VPN'],
                summary: 'Termina una connessione VPN (o tutte, se configName omesso)',
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: { configName: { type: 'string' } }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Connessione/i terminate' },
                    400: { description: 'Nome configurazione non valido' },
                    401: { description: 'Autenticazione richiesta' },
                    404: { description: 'Nessuna connessione attiva per questa configurazione' },
                    500: { description: 'Errore durante la disconnessione' }
                }
            }
        },
        '/api/vpn/stats': {
            get: {
                tags: ['VPN'],
                summary: 'Statistiche delle connessioni attive',
                responses: {
                    200: {
                        description: 'Statistiche connessioni',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        stats: {
                                            type: 'object',
                                            properties: {
                                                connected: { type: 'boolean' },
                                                count: { type: 'integer' },
                                                managementAvailable: { type: 'boolean' },
                                                connections: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            config: { type: 'string' },
                                                            mgmtPort: { type: 'integer' },
                                                            uptimeSeconds: { type: 'integer' },
                                                            clients: { type: 'integer', nullable: true },
                                                            bytesIn: { type: 'integer', nullable: true },
                                                            bytesOut: { type: 'integer', nullable: true },
                                                            managementAvailable: { type: 'boolean' }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    401: { description: 'Autenticazione richiesta' }
                }
            }
        },
        '/api/vpn/logs': {
            get: {
                tags: ['VPN'],
                summary: 'Log di sistema OpenVPN (o log applicativo come fallback)',
                responses: {
                    200: {
                        description: 'Log',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        logs: { type: 'string' },
                                        source: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    401: { description: 'Autenticazione richiesta' }
                }
            }
        },
        '/api/vpn/upload': {
            post: {
                tags: ['VPN'],
                summary: 'Carica un file di configurazione .ovpn/.conf (max 512 KB)',
                requestBody: {
                    required: true,
                    content: {
                        'multipart/form-data': {
                            schema: {
                                type: 'object',
                                required: ['config'],
                                properties: {
                                    config: { type: 'string', format: 'binary' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Configurazione caricata' },
                    400: { description: 'File mancante o nome non valido' },
                    401: { description: 'Autenticazione richiesta' },
                    409: { description: 'Configurazione già esistente' },
                    413: { description: 'File troppo grande' }
                }
            }
        }
    }
};
