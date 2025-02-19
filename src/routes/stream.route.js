// src/routes/stream.route.js
import express from 'express';
import { StreamHandler } from '../handlers/stream.handler.js';

const router = express.Router();

/**
 * Endpoint para retornar os streams disponíveis para um conteúdo.
 * URL exemplo: /stream/:token/:type/:id.json
 *
 * - token: Token de configuração do usuário (base64)
 * - type: Tipo de conteúdo ("movie", "series", etc.)
 * - id: Identificador do conteúdo (por exemplo, "tt21209876:2:2" ou "kitsu:12345:...")
 */
router.get('/:token/stream/:type/:id.json', async (req, res) => {
  const { token, type, id } = req.params;
  try {
    const result = await StreamHandler.getStreams({ token, type, id });
    res.json(result);
  } catch (err) {
    console.error("Erro ao obter streams:", err);
    res.status(500).json({ error: "Falha ao buscar streams", details: err.message });
  }
});

export default router;
