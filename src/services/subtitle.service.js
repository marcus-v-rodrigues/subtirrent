import ffmpeg from 'fluent-ffmpeg';
import iso6391 from 'iso-639-1';
import { subtitleCache, CACHE_CONFIG, CONFIG } from '../config.js';

export const SubtitleService = {
  /**
   * Analisa um vídeo em busca de fluxos de legenda
   * @param {string} videoUrl - URL do vídeo para análise
   * @returns {Promise<Array>} Lista de fluxos encontrados
   */
  probeSubtitles: async (videoUrl) => new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoUrl, (err, metadata) => {
      err ? reject(err) : resolve(metadata.streams);
    });
  }),

  /**
   * Converte uma legenda para o formato configurado (VTT ou SRT)
   * @param {string} input - URL do vídeo de entrada
   * @param {number} trackIndex - Índice da faixa de legenda
   * @returns {ffmpeg.FfmpegCommand} Stream de conversão do FFmpeg
   */
  convertSubtitle: (input, trackIndex) => {
    // Determina o formato baseado na configuração
    const format = CONFIG.subtitle.format || 'vtt';
    
    console.log('🔄 Convertendo legenda:', {
      input: input,
      trackIndex: trackIndex,
      formatoSaida: format
    });

    // Configura a conversão baseado no formato escolhido
    const outputOptions = [
      `-map 0:${trackIndex}`,
      format === 'vtt' 
        ? ['-c:s webvtt', '-f webvtt'] 
        : ['-c:s srt', '-f srt']
    ].flat();

    return ffmpeg(input)
      .outputOptions(outputOptions);
  },

  /**
   * Retorna o Content-Type apropriado baseado no formato configurado
   * @returns {string} Content-Type para a resposta HTTP
   */
  getContentType: () => {
    return CONFIG.subtitle.format === 'vtt'
      ? 'text/vtt; charset=utf-8'
      : 'application/x-subrip; charset=utf-8';
  },

  validateLanguageCode: (code) => {
    // Tenta extrair o código de idioma de tags comuns
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

    if (languageMap[clean]) {
      return languageMap[clean];
    }

    if (iso6391.validate(clean)) {
      return clean;
    }

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
    console.log('💾 Armazenando legenda no cache:', {
      id: subId,
      formato: CONFIG.subtitle.format
    });
    subtitleCache.set(subId, { 
      ...data, 
      lastAccessed: Date.now(),
      format: CONFIG.subtitle.format // Armazena o formato usado
    });
  },
  
  getCachedSubtitle: (subId) => {
    console.log('🔍 Buscando legenda no cache:', subId);
    const cached = subtitleCache.get(subId);
    if (cached) {
      console.log('✅ Legenda encontrada no cache:', {
        id: subId,
        formato: cached.format
      });
      subtitleCache.set(subId, { ...cached, lastAccessed: Date.now() });
    } else {
      console.log('❌ Legenda não encontrada no cache');
    }
    return cached;
  },

  getCacheStats: () => ({
    size: subtitleCache.size,
    max: CACHE_CONFIG.max,
    ttl: CACHE_CONFIG.ttl
  })
};