import { LRUCache } from 'lru-cache';

// Cache para informações de legendas
export const CACHE_CONFIG = {
    max: 100,
    ttl: 1000 * 60 * 30 // 30 minutos
};

export const subtitleCache = new LRUCache(CACHE_CONFIG);

// Configurações do servidor
export const SERVER_CONFIG = {
    port: process.env.PORT || 7000,
    baseUrl: process.env.BASE_URL || 'http://localhost:7000'
};

// Manifest do addon para o Stremio
export const MANIFEST = {
    id: 'org.subtirrent',
    version: '1.0.0',
    name: 'Subtirrent',
    description: 'Extrai legendas embutidas de torrents usando AllDebrid',
    resources: ['subtitles'],
    types: ['movie', 'series'],
    idPrefixes: ['tt'],
    catalogs: [] 
};

// Configurações da aplicação
export const CONFIG = {
    alldebrid: {
        apiKey: process.env.ALLDEBRID_API_KEY,
        enabled: true
    },
    subtitle: {
        preferredLanguages: ['eng', 'por'],
        convertToUtf8: true,
        cacheTimeout: 1800
    }
};