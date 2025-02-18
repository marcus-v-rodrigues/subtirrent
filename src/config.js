/**
 * @file src/config.js
 * @description Configurações globais e manifesto do addon.
 * 
 * Neste arquivo, definimos o manifesto do addon para que ele seja configurável.
 * Isso é feito definindo behaviorHints.configurable como true e declarando
 * o array "config" com os campos que os usuários podem editar (ex.: AllDebrid API Key e
 * o formato das legendas).
 */

import { LRUCache } from 'lru-cache';

// Cache para legendas
export const CACHE_CONFIG = {
  max: 100,
  ttl: 1000 * 60 * 30 // 30 minutos
};

export const subtitleCache = new LRUCache(CACHE_CONFIG);

// Configurações do servidor
const port = process.env.PORT || 7000;
let baseUrl = process.env.BASE_URL || "http://localhost";

// Se a URL de ambiente for "localhost" e não incluir a porta, anexa-a.
if (baseUrl.includes("localhost") && !baseUrl.includes(`:${port}`)) {
  baseUrl = `${baseUrl}:${port}`;
}

export const SERVER_CONFIG = { port, baseUrl };

/**
 * Manifest do addon.
 * - behaviorHints.configurable: Informa que o addon possui configurações personalizáveis.
 * - config: Array de objetos definindo os campos que o usuário pode configurar.
 *
 * Quando o addon for configurado, o Stremio passará um objeto com esses dados para os handlers
 * em extra.config.
 */
export const MANIFEST = {
  id: 'org.subtirrent',
  version: '1.0.0',
  name: 'Subtirrent',
  description: 'Extrai legendas embutidas de torrents usando AllDebrid',
  resources: ['subtitles'],
  types: ['movie', 'series'],
  catalogs: [],
  behaviorHints: {
    p2p: false,
    configurable: true,           // Permite que o Stremio gere uma página de configuração (/configure)
    configurationRequired: false  // Se true, o addon não pode ser instalado sem configuração
  },
  // Declaração dos campos de configuração (user data)
  config: [
    {
      key: "alldebrid.apiKey",
      type: "text",
      title: "AllDebrid API Key",
      required: true,
      default: ""
    },
    {
      key: "subtitle.format",
      type: "select",
      title: "Formato das Legendas",
      options: ["srt", "vtt"],
      default: "srt"
    }
  ]
};

// CONFIG é o fallback (valores defaults) caso o user data não esteja presente
export const CONFIG = {
  alldebrid: {
    apiKey: null,
    enabled: true
  },
  subtitle: {
    format: 'srt',
    preferredLanguages: ['eng', 'por'],
    convertToUtf8: true,
    cacheTimeout: 1800
  }
};
