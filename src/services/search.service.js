import fetch from 'node-fetch';
import { TorrentProvisionService } from './torrentProvision.service.js';

export const SearchService = {
  /**
   * Pesquisa um torrent via Torrentio e utiliza o AllDebrid para desbloquear o link.
   * Se o AllDebrid não desbloquear, provisiona o torrent diretamente via WebTorrent.
   * 
   * @param {string} query - Termo para busca (por exemplo, título ou filename)
   * @param {string} apiKey - Chave da API do AllDebrid
   * @returns {Promise<string>} URL de streaming do torrent
   */
  async getStreamUrl(query, apiKey) {
    try {
      const torrentData = await TorrentProvisionService.searchTorrent(query);
      console.log('Torrent encontrado:', torrentData);
      if (!torrentData || !torrentData.magnet) {
        throw new Error("Nenhum torrent encontrado");
      }
      const unlockRes = await fetch(
        `https://api.alldebrid.com/v4/link/unlock?agent=subtirrent&apikey=${apiKey}&link=${encodeURIComponent(torrentData.magnet)}`
      );
      const unlockData = await unlockRes.json();
      if (unlockData.status === 'success' && unlockData.data.link) {
        console.log('AllDebrid desbloqueou o link:', unlockData.data.link);
        return unlockData.data.link;
      } else {
        console.warn('AllDebrid não desbloqueou o link, provisionando via WebTorrent...');
        const streamUrl = await TorrentProvisionService.provisionTorrent(torrentData.magnet);
        return streamUrl;
      }
    } catch (error) {
      console.error('Erro no SearchService.getStreamUrl:', error);
      throw error;
    }
  },
};
