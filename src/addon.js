// addon.js
import { addonBuilder } from 'stremio-addon-sdk';
import { MANIFEST, CONFIG } from './config.js';
import { SubtitleHandler } from './handlers/subtitle.handler.js';

/**
 * Cria uma nova instância do addon com o manifest definido
 * O manifest contém metadados como nome, versão e recursos suportados
 */
const builder = new addonBuilder({
    ...MANIFEST,
    resources: ['subtitles'],  // Apenas subtitles, não precisamos de stream
    types: ['movie', 'series']
});

/**
 * Define o manipulador de legendas para o addon
 * Este manipulador é chamado quando o Stremio solicita legendas para um vídeo
 * 
 * @param {Object} params - Parâmetros da requisição
 * @param {string} params.id - ID do conteúdo (ex: "tt1234567:2")
 * @param {Object} params.extra - Dados adicionais do vídeo
 */
builder.defineSubtitlesHandler(({ id, type, extra = {} }) => {
    // Log detalhado da requisição
    console.log('Requisição de legendas recebida:', {
        timestamp: new Date().toISOString(),
        id,
        type,
        extra: JSON.stringify(extra, null, 2)
    });

    // Verifica configuração do AllDebrid
    if (!CONFIG.alldebrid.apiKey) {
        console.warn('AllDebrid não configurado');
        return Promise.resolve({ subtitles: [] });
    }

    // Processa a requisição
    return SubtitleHandler.processRequest({
        filename: id,
        apiKey: CONFIG.alldebrid.apiKey,
        extra
    });
});

// Log da inicialização do addon
console.log('Iniciando addon com configuração:', {
    manifest: {
        id: MANIFEST.id,
        version: MANIFEST.version,
        resources: MANIFEST.resources
    },
    allDebridConfigured: !!CONFIG.alldebrid.apiKey
});

export const addonInterface = builder.getInterface();