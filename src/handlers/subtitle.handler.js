import { SearchService } from "../services/search.service.js";
import { SubtitleService } from "../services/subtitle.service.js";
import { KitsuService } from "../services/kitsu.service.js";
import { SERVER_CONFIG } from "../config.js";

export const SubtitleHandler = {
  /**
   * Processa uma requisição de legendas do Stremio.
   * @param {Object} params - Parâmetros da requisição.
   * @param {string} params.token - String (em base64) com os dados de configuração do usuário.
   * @param {string} params.filename - Nome do arquivo ou ID do conteúdo (ex: "1234567:1:1" ou "kitsu:12345:...").
   * @param {number} params.videoSize - Tamanho do vídeo (em bytes).
   * @param {string} params.apiKey - Chave da API do AllDebrid.
   * @param {string} params.format - Formato escolhido para a legenda.
   * @returns {Promise<Object>} - Objeto com a lista de legendas disponíveis.
   */
  async processRequest({ token, filename, videoSize, apiKey, format }) {
    try {
      console.log("🎯 Detalhes da requisição:", {
        filename,
        videoSize,
        hasApiKey: !!apiKey,
        format
      });
      if (!filename || !apiKey || !videoSize) {
        console.log("⚠️ Parâmetros inválidos");
        return { subtitles: [] };
      }
      // Decodifica a configuração do usuário
      const userConfig = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));

      // Define o termo de busca. Se o suporte a Kitsu estiver habilitado, obtém o título via Kitsu.
      let searchQuery = filename;
      if (
        userConfig.subtitle &&
        userConfig.subtitle.kitsu &&
        userConfig.subtitle.kitsu.enabled
      ) {
        const parts = filename.split(':');
        const kitsuId = (parts[0].toLowerCase() === 'kitsu' && parts[1]) ? parts[1] : filename;
        try {
          const kitsuTitle = await KitsuService.getAnimeTitle(kitsuId);
          console.log("Título obtido do Kitsu:", kitsuTitle);
          searchQuery = kitsuTitle;
        } catch (error) {
          console.warn("Falha ao obter título do Kitsu; usando o filename como query");
        }
      }

      // Busca a URL de streaming usando o SearchService (Torrentio + AllDebrid)
      console.log("🔍 Buscando stream URL via SearchService...");
      const streamUrl = await SearchService.getStreamUrl(searchQuery, videoSize, apiKey);
      if (!streamUrl) {
        throw new Error("URL de streaming não encontrada");
      }
      console.log("✅ Stream URL obtida:", streamUrl);

      // Prova o stream usando FFmpeg para extrair as faixas de legenda
      console.log("🔍 Buscando faixas de legenda...");
      const tracks = await SubtitleService.probeSubtitles(streamUrl);
      if (!tracks || !Array.isArray(tracks)) {
        throw new Error("Nenhuma faixa de legenda encontrada");
      }
      console.log(`✅ Encontradas ${tracks.length} faixas`);

      const subtitles = tracks
        .filter((track) => track.codec_type === "subtitle")
        .map((track, index) => {
          const lang = track.tags?.language || "und";
          const subId = `${filename}:${index}`;
          console.log(`📝 Processando legenda ${index}:`, {
            lang,
            codec: track.codec_name,
            tags: track.tags,
          });
          // Armazena a legenda no cache
          SubtitleService.cacheSubtitle(subId, format, {
            streamUrl,
            trackIndex: track.index || index,
            language: lang,
            codec: track.codec_name,
          });
          // Gera a URL para extração da legenda, incorporando o token de configuração
          const subtitleUrl = `${SERVER_CONFIG.baseUrl}/${encodeURIComponent(token)}/extract/${encodeURIComponent(subId)}`;
          console.log(`🔗 URL da legenda gerada: ${subtitleUrl}`);
          return {
            id: subId,
            url: subtitleUrl,
            lang: SubtitleService.validateLanguageCode(lang),
            name: `${SubtitleService.getLanguageName(lang)} - ${track.tags?.title || "Track " + index}`,
          };
        });
      console.log(`✅ Processadas ${subtitles.length} legendas`);
      return { subtitles };
    } catch (error) {
      console.error("❌ Erro no processamento:", {
        message: error.message,
        stack: error.stack,
      });
      return { subtitles: [] };
    }
  },

  /**
   * Extrai uma legenda específica e converte para o formato configurado.
   * @param {string} subId - ID único da legenda (formato: filename:index)
   * @returns {Promise<Stream>} - Stream da legenda no formato configurado
   */
  async extractSubtitle(subId) {
    console.log("🎯 Extraindo legenda:", subId);
    const cached = SubtitleService.getCachedSubtitle(subId);
    if (!cached) {
      console.log("❌ Legenda não encontrada no cache");
      throw new Error("Informações da legenda não encontradas no cache");
    }
    console.log("✅ Legenda encontrada no cache:", cached);
    console.log("📝 Formato de saída:", cached.format);
    return SubtitleService.convertSubtitle(cached.streamUrl, cached.trackIndex, cached.format);
  },
};
