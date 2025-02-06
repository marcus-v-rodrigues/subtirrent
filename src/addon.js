import { addonBuilder } from 'stremio-addon-sdk';
import { MANIFEST, CONFIG } from './config.js';
import { SubtitleHandler } from './handlers/subtitle.handler.js';

// Cria uma nova instância do addon com as configurações do manifest
const builder = new addonBuilder(MANIFEST);

// Define o manipulador de requisições de legendas
builder.defineSubtitlesHandler(async ({ id, extra }) => {
    try {
        // Verifica se o AllDebrid está configurado
        if (!CONFIG.alldebrid.apiKey) {
            console.warn('Chave da API do AllDebrid não configurada');
            return { subtitles: [] };
        }

        // Delega o processamento para o SubtitleHandler
        return await SubtitleHandler.processRequest({
            id,
            extra,
            apiKey: CONFIG.alldebrid.apiKey
        });

    } catch (error) {
        console.error('Erro no manipulador de legendas:', error);
        return { subtitles: [] };
    }
});

// Exporta a interface do addon para uso pelo servidor
export const addonInterface = builder.getInterface();