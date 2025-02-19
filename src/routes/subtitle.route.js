import express from 'express';
import { SubtitleHandler } from '../handlers/subtitle.handler.js';

const router = express.Router();

/**
 * Extrai o filename do id recebido.
 * Exemplo: "series/tt21209876:2:2/videoHash=c3d9f7efdb214343&videoSize=1441633438"
 * retorna "tt21209876:2:2"
 *
 * @param {string} id - O id completo recebido na URL
 * @returns {string} O filename extraído
 */
const parseFilename = (id) => {
  if (typeof id !== 'string') {
    throw new Error('O id deve ser uma string');
  }

  // Divide a string por "/"
  const segments = id.split('/');

  if (segments.length < 2) {
    throw new Error('Formato inválido: não há segmentos suficientes na string');
  }

  return segments[1];
}


router.get('/:token/subtitles/:id(*)', async (req, res) => {
  const { token } = req.params;
  // Remove eventual sufixo ".json"
  const rawId = req.params.id.replace(/\.json$/, '');
  
  // Utiliza a função parseFilename para extrair corretamente o filename
  const filename = parseFilename(rawId);
  
  // O tamanho do vídeo é esperado na query string, ex: ?videoSize=1441633438
  const videoSize = parseInt(req.query.videoSize, 10);
  
  let userConfig = {};
  try {
    userConfig = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
  } catch (error) {
    console.error('Erro ao decodificar token de configuração:', error);
    return res.status(400).json({ error: 'Token de configuração inválido' });
  }
  
  if (!userConfig.alldebrid || !userConfig.alldebrid.apiKey) {
    console.warn('API key não configurada.');
    return res.json({ subtitles: [] });
  }
  if (!userConfig.subtitle || !userConfig.subtitle.format) {
    console.warn('Formato de legenda não configurado.');
    return res.json({ subtitles: [] });
  }
  
  try {
    const result = await SubtitleHandler.processRequest({
      token,
      filename, // Usa o filename extraído (por exemplo: "21209876:2:2")
      videoSize,
      apiKey: userConfig.alldebrid.apiKey,
      format: userConfig.subtitle.format
    });
    res.json(result);
  } catch (err) {
    console.error('Erro ao processar requisição de legendas:', err);
    res.status(500).json({ error: 'Falha ao processar legenda', details: err.message });
  }
});

router.get('/:token/extract/:id', async (req, res) => {
  const { token, id } = req.params;
  let userConfig = {};
  try {
    userConfig = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
  } catch (error) {
    console.error('Erro ao decodificar token de configuração:', error);
    return res.status(400).json({ error: 'Token de configuração inválido' });
  }
  
  if (!userConfig.alldebrid || !userConfig.alldebrid.apiKey) {
    console.warn('API key não configurada.');
    return res.json({ subtitles: [] });
  }
  if (!userConfig.subtitle || !userConfig.subtitle.format) {
    console.warn('Formato de legenda não configurado.');
    return res.json({ subtitles: [] });
  }
  
  try {
    const stream = await SubtitleHandler.extractSubtitle(id);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    stream.pipe(res);
  } catch (err) {
    console.error('Erro ao extrair legenda:', err);
    res.status(500).json({ error: 'Falha ao extrair legenda', details: err.message });
  }
});

export default router;
