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

export const MANIFEST = {
    id: 'org.subtirrent',
    version: '1.0.0',
    name: 'Subtirrent',
    description: 'Extrai legendas embutidas de torrents usando AllDebrid',
    // Garante que subtitles está nos recursos
    resources: ['subtitles'],
    types: ['movie', 'series'],
    // Remove idPrefixes para aceitar qualquer ID
    catalogs: [],
    // Configuração simplificada
    behaviorHints: {
        p2p: false
    }
};

// Configuração que pode ser alterada via interface
export const CONFIG = {
    alldebrid: {
        apiKey: null,
        enabled: true
    },
    subtitle: {
        format: 'vtt', // Pode ser 'vtt' ou 'srt'
        preferredLanguages: ['eng', 'por'],
        convertToUtf8: true,
        cacheTimeout: 1800
    }
};