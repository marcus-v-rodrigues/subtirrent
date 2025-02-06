import express from 'express';
import { SubtitleHandler } from '../handlers/subtitle.handler.js';

const router = express.Router();

// Rota para servir arquivos de legenda em formato VTT
router.get('/subtitles/:id', async (req, res) => {
    try {
        // Configura os headers para streaming de WebVTT
        res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        
        // Extrai a legenda e faz streaming direto para o cliente
        const stream = await SubtitleHandler.extractSubtitle(req.params.id);
        
        // Configuração de eventos para o streaming
        stream
            .on('error', (error) => {
                console.error('Erro no streaming da legenda:', error);
                if (!res.headersSent) {
                    res.status(500).json({ 
                        error: 'Falha ao processar legenda',
                        details: error.message
                    });
                }
            })
            .pipe(res);

    } catch (error) {
        console.error('Erro ao servir legenda:', error);
        res.status(500).json({ 
            error: 'Falha ao carregar legenda',
            details: error.message
        });
    }
});

export default router;