import express from 'express';
import { SubtitleHandler } from '../handlers/subtitle.handler.js';
import { SubtitleService } from '../services/subtitle.service.js';
import { CONFIG } from '../config.js';

const router = express.Router();

/**
 * Rota para servir arquivos de legenda em formato VTT
 * Em vez de fazer streaming, coleta todo o conteúdo antes de enviar
 * para melhor compatibilidade com apps de TV
 */
router.get('/subtitles/:id', async (req, res) => {
    try {
        // Log inicial da requisição
        console.log('📥 Recebida requisição de legenda:', {
            id: req.params.id,
            formatoConfigurado: CONFIG.subtitle.format
        });

        // Configura os headers corretos para o formato
        res.set({
            'Content-Type': SubtitleService.getContentType(),
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        // Extrai e converte a legenda
        const stream = await SubtitleHandler.extractSubtitle(req.params.id);
        
        // Pipe o stream diretamente para a resposta
        stream.pipe(res);

        // Log de sucesso
        console.log('✅ Streaming de legenda iniciado');

    } catch (error) {
        console.error('❌ Erro ao servir legenda:', error);
        res.status(500).json({
            error: 'Falha ao processar legenda',
            details: error.message
        });
    }
});

export default router;