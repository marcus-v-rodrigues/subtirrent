import { MatcherService } from '../services/matcher.service.js';
import { SubtitleService } from '../services/subtitle.service.js';

export const SubtitleHandler = {
    /**
     * Processa uma requisição de legendas do Stremio
     * Esta função é chamada quando o Stremio solicita legendas para um vídeo
     * 
     * @param {Object} params - Parâmetros da requisição
     * @param {string} params.filename - Nome do arquivo ou ID do conteúdo (ex: tt1234567:1:1)
     * @param {string} params.apiKey - Chave da API do AllDebrid
     * @param {Object} params.extra - Dados adicionais do vídeo (tamanho, hash, etc)
     * @returns {Promise<Object>} - Lista de legendas disponíveis
     */
    processRequest: async ({ filename, apiKey, extra }) => {
        try {
            // Registra os detalhes iniciais da requisição para debug
            console.log('🎯 Detalhes da requisição:', {
                filename,
                hasApiKey: !!apiKey,
                extraKeys: extra ? Object.keys(extra) : [],
                extraRaw: extra
            });

            // Extrai e processa os parâmetros necessários
            // fileSize é usado para identificar o arquivo correto no AllDebrid
            const fileSize = parseInt(extra?.videoSize);
            // Limpa o filename removendo path e parâmetros
            const cleanFilename = filename.split('/').pop().split('?')[0];
            // Usa o filename do extra se disponível, senão usa o limpo
            const targetFilename = extra?.filename || cleanFilename;

            // Log dos parâmetros processados para debug
            console.log('📊 Parâmetros processados:', {
                targetFilename,
                fileSize,
                hasApiKey: !!apiKey,
                originalFilename: filename
            });

            // Validação dos parâmetros obrigatórios
            if (!targetFilename || !apiKey || !fileSize) {
                console.log('⚠️ Parâmetros inválidos:', {
                    hasFilename: !!targetFilename,
                    hasApiKey: !!apiKey,
                    hasFileSize: !!fileSize
                });
                return { subtitles: [] };
            }

            // Busca o arquivo no AllDebrid e obtém URL de streaming
            console.log('🔍 Buscando stream URL...');
            const streamUrl = await MatcherService.findMedia(targetFilename, apiKey, fileSize);
            
            if (!streamUrl) {
                console.log('❌ Stream URL não encontrada');
                throw new Error('URL de streaming não encontrada');
            }
            console.log('✅ Stream URL encontrada');

            // Analisa o arquivo em busca de faixas de legenda
            console.log('🔍 Buscando faixas de legenda...');
            const tracks = await SubtitleService.probeSubtitles(streamUrl);
            
            // Valida se encontramos faixas de legenda
            if (!tracks || !Array.isArray(tracks)) {
                console.log('❌ Nenhuma faixa de legenda encontrada');
                throw new Error('Nenhuma faixa de legenda encontrada');
            }
            console.log(`✅ Encontradas ${tracks.length} faixas`);

            // Processa cada faixa de legenda encontrada
            const subtitles = tracks
                // Filtra apenas faixas do tipo subtitle
                .filter(track => track.codec_type === 'subtitle')
                // Mapeia cada faixa para o formato esperado pelo Stremio
                .map((track, index) => {
                    // Extrai o código de idioma ou usa 'und' (undefined) se não encontrar
                    const lang = track.tags?.language || 'und';
                    // Cria ID único para esta legenda
                    const subId = `${targetFilename}:${index}`;
                    
                    // Log detalhado de cada faixa
                    console.log(`📝 Processando legenda ${index}:`, {
                        lang,
                        codec: track.codec_name,
                        tags: track.tags
                    });

                    return {
                        lang,
                        subId,
                        codec: track.codec_name,
                        index
                    };
                })
                // Filtra legendas com idioma indefinido
                .filter(track => track.lang !== 'und')
                // Gera o formato final para o Stremio
                .map(track => {
                    SubtitleService.cacheSubtitle(track.subId, {
                        streamUrl,
                        trackIndex: track.index,
                        language: track.lang
                    });

                    return {
                        id: track.subId,
                        url: `${process.env.BASE_URL}/subtitles/${track.subId}`,
                        lang: SubtitleService.validateLanguageCode(track.lang),
                        name: SubtitleService.getLanguageName(track.lang)
                    };
                });

            console.log(`✅ Processadas ${subtitles.length} legendas`);
            return { subtitles };

        } catch (error) {
            // Log detalhado em caso de erro
            console.error('❌ Erro no processamento:', {
                message: error.message,
                stack: error.stack
            });
            return { subtitles: [] };
        }
    },

    /**
     * Extrai uma legenda específica e converte para formato VTT
     * Esta função é chamada quando o Stremio solicita uma legenda específica
     * 
     * @param {string} subId - ID único da legenda (formato: filename:index)
     * @returns {Promise<Stream>} - Stream da legenda em formato VTT
     */
    extractSubtitle: async (subId) => {
        console.log('🎯 Extraindo legenda:', subId);
        
        // Busca informações da legenda no cache
        const cached = SubtitleService.getCachedSubtitle(subId);
        if (!cached) {
            console.log('❌ Legenda não encontrada no cache');
            throw new Error('Informações da legenda não encontradas no cache');
        }
        console.log('✅ Legenda encontrada no cache:', cached);

        // Converte a legenda para formato VTT e retorna o stream
        return SubtitleService.convertToVTT(
            cached.streamUrl,
            cached.trackIndex
        );
    }
};