import fetch from 'node-fetch';
import { LRUCache } from 'lru-cache';

/**
 * Cache para armazenar resultados de buscas recentes
 * Configurado com um TTL menor pois estamos trabalhando com arquivos específicos
 * e queremos garantir que as informações estejam sempre atualizadas
 */
const cache = new LRUCache({
    max: 100,                // Máximo de 100 entradas no cache
    ttl: 1000 * 60 * 15     // 15 minutos de TTL
});

export const MatcherService = {
    /**
     * Busca a lista de downloads ativos no AllDebrid
     * @param {string} apiKey - Chave da API do AllDebrid
     * @returns {Promise<Array>} Lista de downloads ativos
     */
    fetchDownloads: async (apiKey) => {
        try {
            // Faz a requisição para a API do AllDebrid
            const response = await fetch(
                `https://api.alldebrid.com/v4/magnet/status?agent=subtirrent&apikey=${apiKey}`
            );

            if (!response.ok) {
                throw new Error(`Erro na API do AllDebrid: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Valida a resposta da API
            if (data.status !== 'success') {
                throw new Error(`Resposta inválida da API: ${data.error || 'Erro desconhecido'}`);
            }

            // Retorna a lista de downloads ou array vazio se não houver dados
            return data.data.magnets || [];

        } catch (error) {
            console.error('Falha ao buscar downloads:', error);
            throw error;
        }
    },

    /**
     * Encontra um arquivo específico nos downloads baseado no tamanho e na proximidade do horário de conclusão.
     * Usa o tamanho do arquivo como principal critério e, dentre os que atenderem, seleciona aquele cuja
     * propriedade completionDate (convertida para milissegundos) esteja mais próxima do horário atual da requisição.
     * 
     * @param {Array} downloads - Lista de downloads do AllDebrid
     * @param {number} videoSize - Tamanho do arquivo em bytes
     * @returns {Object|null} Arquivo encontrado ou null
     */
    findExactFile: (downloads, videoSize) => {
        if (!downloads || !Array.isArray(downloads)) {
            console.warn('Lista de downloads inválida');
            return null;
        }
        if (!videoSize || videoSize <= 0) {
            console.warn('Tamanho de arquivo inválido:', videoSize);
            return null;
        }

        // Define uma margem de erro de 1% para comparação de tamanhos
        const sizeMargin = videoSize * 0.01;
        const now = Date.now();
        let bestMatch = null;
        let bestTimeDiff = Infinity;

        for (const download of downloads) {
            // Considera apenas downloads prontos e com links disponíveis
            if (download.status !== 'Ready' || !download.links) {
                continue;
            }
            
            // Usa completionDate para comparação, convertendo de segundos para milissegundos
            const completionTimestamp = download.completionDate && download.completionDate > 0 
                ? download.completionDate * 1000 
                : now; // Se não houver completionDate, utiliza o horário atual
            const timeDiff = Math.abs(now - completionTimestamp);

            for (const link of download.links) {
                // Verifica se o tamanho do arquivo corresponde (dentro da margem de erro)
                const sizeDiff = Math.abs(link.size - videoSize);
                if (sizeDiff <= sizeMargin) {
                    // Seleciona o link com a menor diferença de horário
                    if (timeDiff < bestTimeDiff) {
                        bestTimeDiff = timeDiff;
                        bestMatch = link;
                        console.log('Arquivo potencial encontrado:', {
                            filename: link.filename,
                            size: link.size,
                            expectedSize: videoSize,
                            sizeDifference: sizeDiff,
                            timeDifference: timeDiff,
                            completionTimestamp: completionTimestamp
                        });
                    }
                }
            }
        }

        if (bestMatch) {
            console.log('Arquivo selecionado:', bestMatch);
        } else {
            console.warn('Arquivo não encontrado com o tamanho especificado:', { size: videoSize });
        }
        return bestMatch;
    },


    /**
     * Obtém o link de streaming direto para um arquivo
     * @param {string} link - Link do arquivo no AllDebrid
     * @param {string} apiKey - Chave da API do AllDebrid
     * @returns {Promise<string|null>} URL de streaming ou null
     */
    getStreamUrl: async (link, apiKey) => {
        try {
            const response = await fetch(
                `https://api.alldebrid.com/v4/link/unlock?agent=subtirrent&apikey=${apiKey}&link=${link}`
            );

            const data = await response.json();
            
            if (data.status !== 'success') {
                throw new Error(`Falha ao desbloquear link: ${data.error || 'Erro desconhecido'}`);
            }

            return data.data.link || null;

        } catch (error) {
            console.error('Falha ao obter URL de streaming:', error);
            throw error;
        }
    },

    /**
     * Função principal que coordena a busca do arquivo específico
     * @param {string} filename - Nome do arquivo
     * @param {string} apiKey - Chave da API do AllDebrid
     * @param {number} videoSize - Tamanho do arquivo em bytes
     * @returns {Promise<string>} URL de streaming do arquivo
     */
    findMedia: async (filename, apiKey, videoSize) => {
        try {
            // Validação dos parâmetros
            if (!filename || !apiKey || !videoSize) {
                throw new Error('Parâmetros inválidos para busca de mídia');
            }

            // Cria uma chave única para o cache que inclui o tamanho
            const cacheKey = `${filename}-${videoSize}`;
            
            // Verifica primeiro no cache
            const cached = cache.get(cacheKey);
            if (cached) {
                console.log('Usando resultado em cache para:', filename);
                return cached.streamUrl;
            }

            // Busca downloads ativos no AllDebrid
            const downloads = await MatcherService.fetchDownloads(apiKey);
            
            // Encontra o arquivo específico usando o tamanho como referência
            const match = MatcherService.findExactFile(downloads, videoSize);
            
            if (!match) {
                throw new Error(`Arquivo não encontrado: ${filename} (${videoSize} bytes)`);
            }

            // Obtém URL de streaming
            const streamUrl = await MatcherService.getStreamUrl(match.link, apiKey);
            
            if (!streamUrl) {
                throw new Error('Falha ao obter URL de streaming');
            }

            // Armazena no cache para futuras requisições
            cache.set(cacheKey, {
                streamUrl,
                filename: match.filename,
                size: match.size,
                timestamp: Date.now()
            });

            return streamUrl;

        } catch (error) {
            console.error('Falha na busca de mídia:', error);
            throw error;
        }
    },

    /**
     * Limpa o cache manualmente
     * Útil para desenvolvimento ou para forçar novas buscas
     */
    clearCache: () => {
        cache.clear();
    }
};