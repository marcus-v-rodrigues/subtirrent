import { MatcherService } from '../services/matcher.service.js';
import { SubtitleService } from '../services/subtitle.service.js';

export const SubtitleHandler = {
    /**
     * Processa uma requisição de legendas
     * @param {Object} params - Parâmetros da requisição
     * @param {string} params.filename - Nome do arquivo ou ID do conteúdo
     * @param {string} params.apiKey - Chave da API do AllDebrid
     * @param {Object} params.extra - Dados adicionais do vídeo
     * @returns {Promise<Object>} - Lista de legendas disponíveis
     */
    processRequest: async ({ filename, apiKey, extra }) => {
        try {
            // Log inicial para debug
            console.log('Recebida requisição de legendas:', {
                filename,
                hasExtra: !!extra,
                extraKeys: extra ? Object.keys(extra) : []
            });

            // Extrai o tamanho do arquivo e limpa o filename
            const fileSize = parseInt(extra?.videoSize);
            const cleanFilename = filename.split('/').pop().split('?')[0];

            // Se temos filename no extra, vamos usá-lo
            const targetFilename = extra?.filename || cleanFilename;

            // Validação dos parâmetros com log detalhado
            if (!targetFilename || !apiKey || !fileSize) {
                console.log('Parâmetros da requisição:', {
                    targetFilename,
                    hasApiKey: !!apiKey,
                    fileSize,
                    originalFilename: filename,
                    extraFilename: extra?.filename
                });
                return { subtitles: [] };
            }

            // Busca o arquivo específico
            const streamUrl = await MatcherService.findMedia(targetFilename, apiKey, fileSize);
            
            if (!streamUrl) {
                throw new Error('URL de streaming não encontrada');
            }

            // Resto do código permanece o mesmo...
            const tracks = await SubtitleService.probeSubtitles(streamUrl);
            
            if (!tracks || !Array.isArray(tracks)) {
                throw new Error('Nenhuma faixa de legenda encontrada');
            }

            const subtitles = tracks
                .filter(track => track.codec_type === 'subtitle')
                .map((track, index) => {
                    const lang = track.tags?.language || 'und';
                    const subId = `${targetFilename}:${index}`;

                    SubtitleService.cacheSubtitle(subId, {
                        streamUrl,
                        trackIndex: index,
                        language: lang
                    });

                    return {
                        id: subId,
                        url: `${process.env.BASE_URL}/subtitles/${subId}`,
                        lang: SubtitleService.validateLanguageCode(lang),
                        name: SubtitleService.getLanguageName(lang)
                    };
                });

            return { subtitles };

        } catch (error) {
            console.error('Falha no processamento da legenda:', error);
            return { subtitles: [] };
        }
    },

    extractSubtitle: async (subId) => {
        const cached = SubtitleService.getCachedSubtitle(subId);
        
        if (!cached) {
            throw new Error('Informações da legenda não encontradas no cache');
        }

        return SubtitleService.convertToVTT(
            cached.streamUrl,
            cached.trackIndex
        );
    }
};