import ffmpeg from 'fluent-ffmpeg';
import iso6391 from 'iso-639-1';
import { subtitleCache, CACHE_CONFIG } from './config.js';

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

  getLanguageInfo: (code) => {
    return {
      code: iso6391.validate(code) ? code : 'und',
      name: iso6391.getName(code) || 'Unknown'
    };
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