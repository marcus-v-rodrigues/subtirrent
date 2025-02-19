// src/handlers/stream.handler.js
import fetch from 'node-fetch';
import { SearchService } from "../services/search.service.js";
import { KitsuService } from "../services/kitsu.service.js";

/**
 * Obtém os metadados da obra a partir do Cinemeta, usando o IMDb ID e o tipo.
 * @param {string} type - Tipo do conteúdo ("movie" ou "series")
 * @param {string} imdbId - O IMDb ID (ex: "tt21209876")
 * @returns {Promise<Object>} Objeto com os metadados (ex: title, canonicalTitle, etc.)
 */
async function getCinemetaMetadata(type, imdbId) {
  const url = `https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`;
  console.log(`Consultando Cinemeta em: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Cinemeta error: ${response.statusText}`);
  }
  const data = await response.json();
  if (data && data.meta) {
    return data.meta;
  }
  throw new Error("Nenhum metadado encontrado no Cinemeta");
}

/**
 * Extrai o IMDb ID do parâmetro id.
 * Exemplo: "tt21209876:2:1" -> "tt21209876"
 * @param {string} id - O id recebido na URL
 * @returns {string} IMDb ID extraído
 */
function extractImdbId(id) {
  const parts = id.split(':');
  return parts[0];
}

export const StreamHandler = {
  /**
   * Decodifica o token, obtém os metadados da obra via Cinemeta e usa o título para buscar a URL de streaming.
   * Retorna um array de streams para o Stremio.
   *
   * @param {Object} params - Parâmetros da requisição
   * @param {string} params.token - Token de configuração do usuário (base64)
   * @param {string} params.type - Tipo de conteúdo ("movie", "series", etc.)
   * @param {string} params.id - Identificador do conteúdo (ex: "tt21209876:2:1" ou "kitsu:12345:...")
   * @returns {Promise<Object>} Objeto contendo um array de streams
   */
  async getStreams({ token, type, id }) {
    try {
      // Decodifica as configurações do usuário
      const userConfig = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      const apiKey = userConfig.alldebrid.apiKey;

      // Extrai o IMDb ID do parâmetro id (assumindo que obras de filmes/séries possuem esse formato)
      const imdbId = extractImdbId(id);
      console.log("IMDb ID extraído:", imdbId);

      // Consulta o Cinemeta para obter os metadados da obra
      const meta = await getCinemetaMetadata(type, imdbId);
      console.log("Metadados obtidos do Cinemeta:", meta);

      // Define a query de busca usando o título canônico, se disponível, ou o título normal
      const query = meta.canonicalTitle || meta.title || id;
      console.log("Query de busca definida:", query);

      // Se o suporte a Kitsu estiver habilitado, pode-se também tentar obter um título alternativo
      if (userConfig.subtitle && userConfig.subtitle.kitsu && userConfig.subtitle.kitsu.enabled) {
        const parts = id.split(':');
        if (parts[0].toLowerCase() === 'kitsu' && parts[1]) {
          try {
            const kitsuTitle = await KitsuService.getAnimeTitle(parts[1]);
            console.log("Título obtido do Kitsu:", kitsuTitle);
            // Se o título obtido via Kitsu for diferente, pode-se concatenar ou substituir
            // Aqui optamos por substituir a query caso o título seja obtido com sucesso
            query = kitsuTitle;
          } catch (error) {
            console.warn("Falha ao obter título do Kitsu; mantendo query baseada no Cinemeta");
          }
        }
      }

      // Chama o SearchService para obter a URL de streaming usando a query definida e a API do AllDebrid
      const streamUrl = await SearchService.getStreamUrl(query, apiKey);
      if (!streamUrl) {
        throw new Error("URL de streaming não encontrada");
      }
      console.log("✅ Stream URL obtida:", streamUrl);

      // Monta o objeto de stream para o Stremio
      const stream = {
        name: `${type.toUpperCase()} Torrent - ${query}`,
        url: streamUrl,
        behaviorHints: {
          bingeGroup: "subtirrent"
        }
      };

      return { streams: [stream] };

    } catch (err) {
      console.error("Erro no handler de streams:", err);
      throw err;
    }
  }
};
