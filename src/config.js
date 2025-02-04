import { LRUCache } from 'lru-cache';

export const SERVER_CONFIG = {
  port: 7000,
  torrentPorts: { start: 6881, end: 6889 },
  baseUrl: process.env.BASE_URL || 'http://localhost'
};

export const CACHE_CONFIG = {
  max: 100,
  ttl: 30 * 60 * 1000 // 30 minutos
};

export const subtitleCache = new LRUCache(CACHE_CONFIG);

export const MANIFEST = {
  id: 'org.subtirrent',
  version: '1.0.2',
  name: 'Subtirrent',
  description: 'Extrai legendas embutidas de torrents em tempo real',
  catalogs: [],
  types: ['movie', 'series'],
  resources: ['subtitles'],
  idPrefixes: ['tt'],
  behaviorHints: { configurable: false }
};