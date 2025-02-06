import fetch from 'node-fetch';
import { LRUCache } from 'lru-cache';

// Cache para armazenar resultados de buscas recentes
// Limite de 100 entradas para evitar consumo excessivo de memória
// TTL de 30 minutos pois os links do AllDebrid podem expirar
const cache = new LRUCache({
    max: 100,
    ttl: 1000 * 60 * 30 // 30 minutos
});

export const MatcherService = {
    // Remove elementos não essenciais do nome do torrent para facilitar comparação
    // Por exemplo: qualidade do vídeo, codecs, tags de release
    cleanName: (name) => {
        return name
            .replace(/\[[^\]]*\]|\([^\)]*\)/g, '') // Remove conteúdo entre [] e ()
            .replace(/\b(480p|720p|1080p|2160p|BRRip|WEBRip|BluRay|x264|x265|HEVC|AAC|AC3|HDR)\b.*$/i, '') // Remove tags técnicas
            .replace(/\./g, ' ') // Substitui pontos por espaços
            .replace(/\s+/g, ' ') // Normaliza espaços múltiplos
            .trim()
            .toLowerCase();
    },

    // Compara dois nomes de torrent para verificar se são o mesmo conteúdo
    // Considera variações comuns em nomes de release e verifica o ano se presente
    compareNames: (name1, name2) => {
        const clean1 = MatcherService.cleanName(name1);
        const clean2 = MatcherService.cleanName(name2);
        
        // Extrai o ano se presente no nome (formato 19XX ou 20XX)
        const year1 = clean1.match(/\b(19|20)\d{2}\b/)?.[0];
        const year2 = clean2.match(/\b(19|20)\d{2}\b/)?.[0];

        // Se ambos têm anos diferentes, não pode ser o mesmo conteúdo
        if (year1 && year2 && year1 !== year2) {
            return false;
        }

        // Remove os anos para comparar apenas os títulos
        const title1 = clean1.replace(/\b(19|20)\d{2}\b/, '').trim();
        const title2 = clean2.replace(/\b(19|20)\d{2}\b/, '').trim();

        // Um título deve estar contido no outro para ser considerado match
        return title1.includes(title2) || title2.includes(title1);
    },

    // Identifica o arquivo de vídeo principal em um torrent com múltiplos arquivos
    // Útil para torrents de séries ou com extras/bônus
    findMainVideoFile: (files) => {
        // Filtra apenas arquivos com extensões de vídeo conhecidas
        const videoFiles = files.filter(file => 
            /\.(mkv|mp4|avi|mov|wmv)$/i.test(file.filename)
        );

        if (!videoFiles.length) return null;

        // Assume que o maior arquivo é o vídeo principal
        // Isso funciona bem para filtrar extras/samples
        return videoFiles.reduce((largest, current) => 
            current.size > largest.size ? current : largest
        );
    },

    // Busca a lista de downloads ativos no AllDebrid
    // Necessário para depois procurar o arquivo específico
    fetchDownloads: async (apiKey) => {
        const response = await fetch(
            `https://api.alldebrid.com/v4/magnet/status?agent=subtirrent&apikey=${apiKey}`
        );

        if (!response.ok) {
            throw new Error(`AllDebrid API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.status === 'success' ? data.data.magnets : [];
    },

    // Obtém o link de streaming direto para um arquivo específico
    // AllDebrid fornece um link HTTP que pode ser usado com FFmpeg
    getStreamUrl: async (link, apiKey) => {
        const response = await fetch(
            `https://api.alldebrid.com/v4/link/unlock?agent=subtirrent&apikey=${apiKey}&link=${link}`
        );

        const data = await response.json();
        return data.status === 'success' ? data.data.link : null;
    },

    // Procura nos downloads ativos por um arquivo que corresponda ao nome procurado
    // Considera tanto o nome do torrent quanto os nomes dos arquivos individuais
    findMatch: (downloads, targetName) => {
        for (const download of downloads) {
            // Ignora downloads que ainda não estão prontos
            if (download.status !== 'Ready') continue;

            // Primeiro tenta corresponder pelo nome do torrent completo
            if (MatcherService.compareNames(download.filename, targetName)) {
                // Se só tem um arquivo, é esse que queremos
                if (download.files.length === 1) {
                    return download.files[0];
                }
                
                // Se tem múltiplos arquivos, procura o vídeo principal
                return MatcherService.findMainVideoFile(download.files);
            }

            // Se não achou pelo nome do torrent, procura arquivo por arquivo
            const matchingFile = download.files.find(file => 
                MatcherService.compareNames(file.filename, targetName)
            );

            if (matchingFile) return matchingFile;
        }

        return null;
    },

    // Função principal que coordena todo o processo de busca
    // Usa cache para evitar requisições repetidas à API
    findMedia: async (filename, apiKey) => {
        // Verifica primeiro no cache
        const cached = cache.get(filename);
        if (cached) return cached.streamUrl;

        try {
            const downloads = await MatcherService.fetchDownloads(apiKey);
            const match = MatcherService.findMatch(downloads, filename);
            
            if (!match) {
                throw new Error(`File not found: ${filename}`);
            }

            const streamUrl = await MatcherService.getStreamUrl(match.link, apiKey);
            
            if (!streamUrl) {
                throw new Error('Failed to get streaming URL');
            }

            // Armazena no cache para futuras requisições
            cache.set(filename, {
                streamUrl,
                filename: match.filename,
                timestamp: Date.now()
            });

            return streamUrl;

        } catch (error) {
            console.error('Media lookup failed:', error);
            throw error;
        }
    },

    // Limpa o cache manualmente se necessário
    // Útil em desenvolvimento ou para forçar novas buscas
    clearCache: () => {
        cache.clear();
    }
};