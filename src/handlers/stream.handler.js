import { SearchService } from "../services/search.service.js";
import { KitsuService } from "../services/kitsu.service.js";

export const StreamHandler = {
  /**
   * Decodifica o token para obter a configuração do usuário, processa o id e chama o SearchService
   * para buscar a URL de streaming. Em seguida, retorna um array de streams para o Stremio.
   *
   * @param {Object} params - Parâmetros da requisição
   * @param {string} params.token - Token de configuração do usuário (base64)
   * @param {string} params.type - Tipo de conteúdo ("movie", "series", etc.)
   * @param {string} params.id - Identificador do conteúdo (ex: "tt21209876:2:2" ou "kitsu:12345:...")
   * @returns {Promise<Object>} Objeto contendo um array de streams
   */
  async getStreams({ token, type, id }) {
    try {
      // Decodifica as configurações do usuário
      const userConfig = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));

      // Usa o id recebido como query; se o suporte a Kitsu estiver habilitado, tenta obter o título via Kitsu.
      let query = id;
      if (
        userConfig.subtitle &&
        userConfig.subtitle.kitsu &&
        userConfig.subtitle.kitsu.enabled
      ) {
        const parts = id.split(':');
        if (parts[0].toLowerCase() === 'kitsu' && parts[1]) {
          try {
            const kitsuTitle = await KitsuService.getAnimeTitle(parts[1]);
            console.log("Título obtido do Kitsu:", kitsuTitle);
            query = kitsuTitle;
          } catch (error) {
            console.warn("Falha ao obter título do Kitsu; usando o id como query");
          }
        }
      }

      const apiKey = userConfig.alldebrid.apiKey;
      
      // Chama o SearchService para obter a URL de streaming (sem depender de videoSize)
      const streamUrl = await SearchService.getStreamUrl(query, apiKey);
      if (!streamUrl) {
        throw new Error("URL de streaming não encontrada");
      }
      console.log("✅ Stream URL obtida:", streamUrl);

      // Monta o objeto de stream para o Stremio
      const stream = {
        name: `${type.toUpperCase()} Torrent - ${query}`,
        url: streamUrl,
        behaviorHints: {
          bingeGroup: "subtirrent"
        }
      };

      return { streams: [stream] };

    } catch (err) {
      console.error("Erro no handler de streams:", err);
      throw err;
    }
  }
};
