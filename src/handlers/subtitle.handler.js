import { MatcherService } from '../services/matcher.service.js';
import { SubtitleService } from '../services/subtitle.service.js';

export const SubtitleHandler = {
  // Processa uma requisição de legendas vinda do Stremio
  // Recebe os parâmetros padrão do Stremio mais a chave da API do AllDebrid
  processRequest: async ({ type, id, extra }, apiKey) => {
      try {
          const { filename } = extra;
          
          // Validação inicial dos parâmetros necessários
          if (!filename || !apiKey) {
              console.error('Missing required parameters:', { filename, apiKey });
              return { subtitles: [] };
          }

          // Localiza o arquivo no AllDebrid e obtém URL de streaming
          const streamUrl = await MatcherService.findMedia(filename, apiKey);
          
          // Analisa o arquivo em busca de faixas de legenda
          // O FFmpeg vai identificar todas as legendas embutidas
          const tracks = await SubtitleService.probeSubtitles(streamUrl);
          
          // Processa cada faixa de legenda encontrada
          const subtitles = tracks
              // Filtra apenas faixas do tipo legenda
              .filter(track => track.codec_type === 'subtitle')
              .map((track, index) => {
                  // Extrai o código do idioma ou usa 'und' (indefinido)
                  const lang = track.tags?.language || 'und';
                  
                  // Cria ID único para esta legenda
                  // Formato: "idDoVideo:índiceDaFaixa"
                  const subId = `${id}:${index}`;

                  // Armazena dados da legenda para extração posterior
                  // Isso evita ter que procurar o arquivo novamente
                  SubtitleService.cacheSubtitle(subId, {
                      streamUrl,
                      trackIndex: index,
                      language: lang
                  });

                  // Retorna no formato que o Stremio espera
                  return {
                      id: subId,
                      url: `${process.env.BASE_URL}/subtitles/${subId}`,
                      lang: SubtitleService.validateLanguageCode(lang),
                      name: SubtitleService.getLanguageName(lang)
                  };
              });

          return { subtitles };

      } catch (error) {
          console.error('Subtitle processing failed:', error);
          // Retorna lista vazia em caso de erro
          // Isso evita que o Stremio pare de funcionar
          return { subtitles: [] };
      }
  },

  // Extrai uma legenda específica usando seu ID
  // Usado quando o Stremio solicita o conteúdo de uma legenda
  extractSubtitle: async (subId) => {
      // Recupera informações da legenda do cache
      const cached = SubtitleService.getCachedSubtitle(subId);
      
      if (!cached) {
          throw new Error('Subtitle information not found in cache');
      }

      // Converte a legenda para formato VTT
      // O Stremio requer legendas em WebVTT
      return SubtitleService.convertToVTT(
          cached.streamUrl,
          cached.trackIndex
      );
  }
};