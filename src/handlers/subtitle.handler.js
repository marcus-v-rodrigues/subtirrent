import { MatcherService } from "../services/matcher.service.js";
import { SubtitleService } from "../services/subtitle.service.js";
import { SERVER_CONFIG, CONFIG } from "../config.js";

export const SubtitleHandler = {
  /**
   * Processa uma requisição de legendas do Stremio
   * Esta função é chamada quando o Stremio solicita legendas para um vídeo
   *
   * @param {Object} params - Parâmetros da requisição
   * @param {string} params.token - String (em base64) com os dados de configuração do usuário
   * @param {string} params.filename - Nome do arquivo ou ID do conteúdo no OpenSubtitles (ex: 1234567:1:1)
   * @param {Object} params.videoSize - Tamanho do vídeo
   * @param {string} params.apiKey - Chave da API do AllDebrid
   * @param {string} params.format - Formato escolhido para a legenda
   * @returns {Promise<Object>} - Lista de legendas disponíveis
   */
  processRequest: async ({ token, filename, videoSize, apiKey, format }) => {
    try {
      console.log("🎯 Detalhes da requisição:", {
        filename,
        videoSize,
        hasApiKey: !!apiKey,
        format
      });

      // Validação dos parâmetros obrigatórios
      if (!filename || !apiKey || !videoSize) {
        console.log("⚠️ Parâmetros inválidos:", {
          hasFilename: !!filename,
          hasVideoSize: !!videoSize,
          hasApiKey: !!apiKey,
          hasFormat: !!format
        });
        return { subtitles: [] };
      }

      // Busca o arquivo no AllDebrid e obtém a URL de streaming
      console.log("🔍 Buscando stream URL...");
      const streamUrl = await MatcherService.findMedia(
        filename,
        apiKey,
        videoSize
      );

      if (!streamUrl) {
        console.log("❌ Stream URL não encontrada");
        throw new Error("URL de streaming não encontrada");
      }
      console.log("✅ Stream URL encontrada");

      // Analisa o arquivo em busca de faixas de legenda
      console.log("🔍 Buscando faixas de legenda...");
      const tracks = await SubtitleService.probeSubtitles(streamUrl);

      if (!tracks || !Array.isArray(tracks)) {
        console.log("❌ Nenhuma faixa de legenda encontrada");
        throw new Error("Nenhuma faixa de legenda encontrada");
      }
      console.log(`✅ Encontradas ${tracks.length} faixas`);

      // Obtém a lista de idiomas preferidos convertendo-os para o mesmo formato usado pela validação
      const preferredLanguages = CONFIG.subtitle.preferredLanguages.map(lang =>
        SubtitleService.validateLanguageCode(lang)
      );

      console.log("preferredLanguages: ", preferredLanguages);

      const subtitles = tracks
        .filter((track) => track.codec_type === "subtitle")
        .filter((track) => {
          const lang = track.tags?.language || "und";
          const validatedLang = SubtitleService.validateLanguageCode(lang);
          return preferredLanguages.includes(validatedLang);
        })
        .map((track, index) => {
          const lang = track.tags?.language || "und";
          const validatedLang = SubtitleService.validateLanguageCode(lang);
          // Usa o filename como base para o ID da legenda
          const subId = `${filename}:${index}`;

          console.log(`📝 Processando legenda ${index}:`, {
            lang: validatedLang,
            codec: track.codec_name,
            tags: track.tags,
          });

          // Armazena a legenda no cache para garantir sua disponibilidade
          SubtitleService.cacheSubtitle(subId, format, {
            streamUrl,
            trackIndex: track.index || index,
            language: validatedLang,
            codec: track.codec_name,
          });

          // Constrói a URL de extração utilizando a rota customizada (/extract/:id)
          // O token é incorporado na URL para que o endpoint saiba qual configuração usar.
          const subtitleUrl = `${SERVER_CONFIG.baseUrl}/${encodeURIComponent(token)}/extract/${encodeURIComponent(subId)}`;
          console.log(`🔗 URL da legenda gerada: ${subtitleUrl}`);

          return {
            id: subId,
            url: subtitleUrl,
            lang: validatedLang,
            name: `${SubtitleService.getLanguageName(validatedLang)} - ${track.tags?.title || "Track " + index}`,
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
  extractSubtitle: async (subId) => {
    console.log("🎯 Extraindo legenda:", subId);

    // Busca informações da legenda no cache
    const cached = SubtitleService.getCachedSubtitle(subId);
    if (!cached) {
      console.log("❌ Legenda não encontrada no cache");
      throw new Error("Informações da legenda não encontradas no cache");
    }
    console.log("✅ Legenda encontrada no cache:", cached);

    console.log("📝 Formato de saída:", cached.format);

    // Converte a legenda para o formato configurado e retorna o stream
    return SubtitleService.convertSubtitle(cached.streamUrl, cached.trackIndex, cached.format);
  },
};
