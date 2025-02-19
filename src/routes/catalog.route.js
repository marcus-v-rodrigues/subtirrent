import express from 'express';

const router = express.Router();

/**
 * Endpoint de catálogo para o Stremio.
 * Exemplo de URL: /:token/catalog/:type.json
 * Este endpoint deve retornar um JSON com os itens do catálogo.
 * Aqui, como exemplo, estamos retornando um catálogo vazio.
 */
router.get('/:token/catalog/:type.json', async (req, res) => {
  const { token, type } = req.params;
  // Aqui você pode decodificar o token se precisar de configurações do usuário
  // Por enquanto, vamos retornar um catálogo vazio ou com alguns itens fictícios
  res.json({
    id: type,
    name: `Catálogo ${type}`,
    type: type,
    items: [] // Adicione itens de catálogo conforme sua lógica
  });
});

export default router;
