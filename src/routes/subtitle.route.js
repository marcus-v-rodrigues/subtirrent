import express from 'express';
import { SubtitleHandler } from '../handlers/subtitle.handler.js';
import { SubtitleService } from '../services/subtitle.service.js';
import { CONFIG } from '../config.js';

const router = express.Router();

/**
 * Rota para processar requisições de legendas.
 * Essa rota utiliza a função processRequest para buscar as legendas embutidas.
 * URL esperada: /:token/subtitles/:id
 *   - token: string (em base64) com os dados de configuração do usuário.
 *   - id: identificador do vídeo (ex: "tt21209876:2:2").
 * Parâmetros extras (como videoHash, videoSize) podem ser passados via query string.
 */
router.get('/:token/subtitles/:id(*)', async (req, res) => {
    const { token } = req.params;
    // req.params.id conterá todo o restante da URL, incluindo as barras.
    const id = req.params.id.replace(/\.json$/, ''); // se necessário remover o .json no final

    // Divide o id pelos '/'
    const parts = id.split('/'); // ["series", "tt21209876:2:2", "videoHash=c3d9f7efdb214343&videoSize=1441633438"]

    // Extrai o filename e remove o "tt"
    const filePart = parts[1]; // "tt21209876:2:2"
    const filename = filePart.replace(/^tt/, ''); // "21209876:2:2"

    // Extrai os parâmetros da parte de query
    const queryString = parts[2]; // "videoHash=c3d9f7efdb214343&videoSize=1441633438"
    const params = new URLSearchParams(queryString);
    const videoSize = parseInt(params.get('videoSize'), 10);

    let userConfig = {};
    try {
      userConfig = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      console.log("userConfig: ", userConfig);
    } catch (error) {
      console.error('Erro ao decodificar token de configuração:', error);
      return res.status(400).json({ error: 'Token de configuração inválido' });
    }
    if (!userConfig.alldebrid || !userConfig.alldebrid.apiKey) {
      console.warn('API key não configurada.');
      return res.json({ subtitles: [] });
    }
    if (!userConfig.subtitle || !userConfig.subtitle.format) {
      console.warn('Formato não configurada.');
      return res.json({ subtitles: [] });
    }
    try {

      const result = await SubtitleHandler.processRequest({
        token,
        filename,
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
  
  /**
   * Rota para extrair uma legenda específica.
   * Essa rota utiliza a função extractSubtitle e retorna o stream da legenda.
   * URL esperada: /:token/extract/:id
   *   - token: string (em base64) com os dados de configuração.
   *   - id: identificador da legenda (geralmente o mesmo utilizado em processRequest).
   */
  router.get('/:token/extract/:id', async (req, res) => {
    const { token, id } = req.params;
    let userConfig = {};
    try {
      // Embora extractSubtitle não necessite dos dados de configuração para converter,
      // mantemos a extração do token para eventuais verificações.
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
      console.warn('Formato não configurada.');
      return res.json({ subtitles: [] });
    }
    try {
      // extractSubtitle retorna um stream com o conteúdo da legenda convertido.
      const stream = await SubtitleHandler.extractSubtitle(id);
      // É importante configurar os headers corretamente para o formato de legenda.
      res.set({
        'Content-Type': SubtitleService.getContentType(userConfig.subtitle.format),
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