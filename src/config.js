// src/config.js
import { LRUCache } from 'lru-cache';

// Configuração do cache para legendas
export const CACHE_CONFIG = {
  max: 100,
  ttl: 1000 * 60 * 30 // 30 minutos
};

export const subtitleCache = new LRUCache(CACHE_CONFIG);

// Configurações do servidor
const port = process.env.PORT || 7000;
let baseUrl = process.env.BASE_URL || 'http://localhost';
if (baseUrl.includes('localhost') && !baseUrl.includes(`:${port}`)) {
  baseUrl = `${baseUrl}:${port}`;
}
export const SERVER_CONFIG = { port, baseUrl, torrentPort: process.env.TORRENT_PORT || 6881 };

// Manifest e configuração padrão para o addon
export const MANIFEST = {
  id: 'org.subtirrent',
  version: '1.0.0',
  name: 'Subtirrent',
  description: 'Extrai legendas embutidas e fornece streams de torrents usando AllDebrid e Torrentio',
  resources: [
    {
        "name": "stream",
        "types": ["movie", "series"],
        "idPrefixes": ["tt", "kitsu"],
    }
  ],
  types: ["movie", "series", "anime", "other"],
  catalogs: [],
  behaviorHints: {
    p2p: false,
    configurable: true,
    configurationRequired: false
  },
  config: [
    {
      key: 'alldebrid.apiKey',
      type: 'text',
      title: 'AllDebrid API Key',
      required: true,
      default: ''
    },
    {
      key: 'subtitle.format',
      type: 'select',
      title: 'Formato das Legendas',
      options: ['srt', 'vtt'],
      default: 'srt'
    },
    {
      key: 'subtitle.kitsu.enabled',
      type: 'checkbox',
      title: 'Habilitar suporte a Kitsu',
      required: false,
      default: false
    }
  ]
};

export const CONFIG = {
  alldebrid: {
    apiKey: null,
    enabled: true
  },
  subtitle: {
    format: 'srt',
    preferredLanguages: ['eng', 'por'],
    convertToUtf8: true,
    cacheTimeout: 1800,
    kitsu: {
      enabled: false
    }
  }
};
