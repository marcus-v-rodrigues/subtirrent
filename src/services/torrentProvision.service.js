import fetch from 'node-fetch';
import { TorrentService } from './torrent.service.js';
import { LRUCache } from 'lru-cache';

const provisionCache = new LRUCache({
  max: 100,
  ttl: 1000 * 60 * 15 // 15 minutos
});

export const TorrentProvisionService = {
  /**
   * Busca torrents usando Torrentio.
   * @param {string} query - Termo de busca (pode ser o filename ou título)
   * @returns {Promise<Object>} Dados do torrent encontrado (deve conter o campo "magnet")
   */
  async searchTorrent(query) {
    const cacheKey = query;
    const cached = provisionCache.get(cacheKey);
    if (cached) {
      console.log('Usando resultado em cache para:', query);
      return cached;
    }
    try {
      console.log(`https://torrentio.strem.fun/search?query=${encodeURIComponent(query)}`)
      const response = await fetch(
        `https://torrentio.strem.fun/search?query=${encodeURIComponent(query)}`
      );
      if (!response.ok) {
        throw new Error(`Erro na busca de torrent: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data.torrents || data.torrents.length === 0) {
        throw new Error('Nenhum torrent encontrado para a busca');
      }
      const selected = data.torrents[0];
      provisionCache.set(cacheKey, selected);
      return selected;
    } catch (error) {
      console.error('Erro na busca de torrent:', error);
      throw error;
    }
  },

  /**
   * Provisiona o torrent utilizando o WebTorrent para obter uma URL de streaming.
   * @param {string} magnet - Link magnet do torrent
   * @returns {Promise<string>} URL de streaming gerada
   */
  async provisionTorrent(magnet) {
    try {
      const torrent = await TorrentService.addTorrent(magnet);
      const file = torrent.files[0];
      return new Promise((resolve, reject) => {
        file.getBlobURL((err, url) => {
          if (err) return reject(err);
          resolve(url);
        });
      });
    } catch (error) {
      console.error('Erro ao provisionar torrent:', error);
      throw error;
    }
  },
};
