import ffmpeg from 'fluent-ffmpeg';
import iso6391 from 'iso-639-1';
import { subtitleCache, CACHE_CONFIG } from '../config.js';

export const SubtitleService = {
  probeSubtitles: async (videoUrl) => new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoUrl, (err, metadata) => {
      err ? reject(err) : resolve(metadata.streams);
    });
  }),

  convertToVTT: (input, trackIndex) => {
    return ffmpeg(input)
      .outputOptions([
        `-map 0:${trackIndex}`,
        '-c:s webvtt',
        '-f webvtt'
      ]);
  },

  validateLanguageCode: (code) => {
    // Tenta extrair o código de idioma de tags comuns
    console.log("Idioma:", code)
    if (!code) return 'und';
    
    const clean = code.toLowerCase().trim();
    
    // Mapeia códigos comuns
    const languageMap = {
      'jpn': 'ja',
      'eng': 'en',
      'por': 'pt',
      'english': 'en',
      'japanese': 'ja',
      'portuguese': 'pt'
    };

    // Tenta usar o mapa primeiro
    if (languageMap[clean]) {
      return languageMap[clean];
    }

    // Verifica se é um código válido
    if (iso6391.validate(clean)) {
      return clean;
    }

    // Tenta extrair os primeiros 2 caracteres se parecerem um código
    const twoChar = clean.slice(0, 2);
    if (iso6391.validate(twoChar)) {
      return twoChar;
    }

    return 'und';
  },

  getLanguageName: (code) => {
    const cleanCode = SubtitleService.validateLanguageCode(code);
    return iso6391.getName(cleanCode) || 'Unknown';
  },

  cacheSubtitle: (subId, data) => {
    subtitleCache.set(subId, { ...data, lastAccessed: Date.now() });
  },
  
  getCachedSubtitle: (subId) => {
    const cached = subtitleCache.get(subId);
    if (cached) {
      subtitleCache.set(subId, { ...cached, lastAccessed: Date.now() });
    }
    return cached;
  },

  getCacheStats: () => ({
    size: subtitleCache.size,
    max: CACHE_CONFIG.max,
    ttl: CACHE_CONFIG.ttl
  })
};