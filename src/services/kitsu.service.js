import fetch from 'node-fetch';

export const KitsuService = {
  /**
   * Obtém o título canônico de um anime a partir do Kitsu.
   * @param {string} animeId - ID do anime no Kitsu
   * @returns {Promise<string>} Título canônico do anime
   */
  async getAnimeTitle(animeId) {
    try {
      const response = await fetch(`https://kitsu.io/api/edge/anime/${animeId}`);
      const data = await response.json();
      return data.data.attributes.canonicalTitle;
    } catch (error) {
      console.error('Erro ao obter título do Kitsu:', error);
      throw error;
    }
  }
};
