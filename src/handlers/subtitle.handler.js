import { MatcherService } from '../services/matcher.service.js';
import { SubtitleService } from '../services/subtitle.service.js';
import { SERVER_CONFIG, CONFIG } from '../config.js';

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
                .filter(track => track.codec_type === 'subtitle')
                .map((track, index) => {
                    const lang = track.tags?.language || 'und';
                    // Usa o targetFilename como base para o ID da legenda
                    const subId = `${targetFilename}:${index}`;
                    
                    console.log(`📝 Processando legenda ${index}:`, {
                        lang,
                        codec: track.codec_name,
                        tags: track.tags
                    });

                    // Cache primeiro, para garantir disponibilidade
                    SubtitleService.cacheSubtitle(subId, {
                        streamUrl,
                        trackIndex: track.index || index,
                        language: lang,
                        codec: track.codec_name
                    });

                    // Gera URL completa com o host base correto
                    const subtitleUrl = `${SERVER_CONFIG.baseUrl}/subtitles/${subId}`;
                    console.log(`🔗 URL da legenda gerada: ${subtitleUrl}`);

                    return {
                        id: subId,
                        url: subtitleUrl,
                        lang: SubtitleService.validateLanguageCode(lang),
                        name: `${SubtitleService.getLanguageName(lang)} - ${track.tags?.title || 'Track ' + index}`
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
     * Extrai uma legenda específica e converte para o formato configurado
     * Esta função é chamada quando o Stremio solicita uma legenda específica
     * 
     * @param {string} subId - ID único da legenda (formato: filename:index)
     * @returns {Promise<Stream>} - Stream da legenda no formato configurado
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

        // Registra o formato que será usado na conversão
        console.log('📝 Formato de saída:', CONFIG.subtitle.format);

        // Converte a legenda para o formato configurado e retorna o stream
        return SubtitleService.convertSubtitle(
            cached.streamUrl,
            cached.trackIndex
        );
    }
};