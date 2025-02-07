import express from 'express';
import { SubtitleHandler } from '../handlers/subtitle.handler.js';

const router = express.Router();

/**
 * Rota para servir arquivos de legenda em formato VTT
 * Em vez de fazer streaming, coleta todo o conteúdo antes de enviar
 * para melhor compatibilidade com apps de TV
 */
router.get('/subtitles/:id', async (req, res) => {
    // Log inicial da requisição
    console.log('📥 Recebida requisição de legenda:', {
        id: req.params.id,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
    });

    try {
        // Buffer para armazenar a legenda completa
        let subtitleContent = '';
        let chunkCount = 0;
        let totalSize = 0;
        
        // Registra início da extração
        console.log('🔄 Iniciando extração da legenda:', req.params.id);
        
        // Extrai a legenda usando o handler
        const stream = await SubtitleHandler.extractSubtitle(req.params.id);
        console.log('✅ Stream de legenda iniciado com sucesso');
        
        // Configura os headers com o Content-Type apropriado
        res.set({
            'Content-Type': SubtitleService.getContentType(),
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        // Coleta os chunks de dados conforme chegam
        stream.on('data', (chunk) => {
            subtitleContent += chunk;
            chunkCount++;
            totalSize += chunk.length;
            
            // Log a cada 5 chunks para não sobrecarregar o console
            if (chunkCount % 5 === 0) {
                console.log('📦 Processando chunks:', {
                    chunksRecebidos: chunkCount,
                    tamanhoAtual: totalSize,
                    ultimoChunkTamanho: chunk.length
                });
            }
        });

        // Quando terminar de receber todos os dados
        stream.on('end', () => {
            console.log('✨ Processamento concluído:', {
                tamanhoTotal: totalSize,
                chunksProcessados: chunkCount,
                temConteudo: subtitleContent.length > 0
            });

            // Log das primeiras linhas para debug
            console.log('📝 Primeiras linhas do VTT:');
            console.log(subtitleContent.split('\n').slice(0, 5).join('\n'));

            // Envia todo o conteúdo de uma vez
            res.send(subtitleContent);
            
            console.log('📤 Legenda enviada com sucesso');
        });

        // Tratamento de erros durante o streaming
        stream.on('error', (error) => {
            console.error('❌ Erro no streaming da legenda:', {
                erro: error.message,
                stack: error.stack,
                chunksProcessados: chunkCount,
                tamanhoProcessado: totalSize
            });
            
            // Se ainda não enviamos resposta, envia erro
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Erro ao processar legenda',
                    details: error.message
                });
            }
        });

    } catch (error) {
        // Log detalhado do erro
        console.error('❌ Erro crítico ao servir legenda:', {
            id: req.params.id,
            erro: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        // Retorna erro detalhado
        res.status(500).json({
            error: 'Falha ao carregar legenda',
            details: error.message,
            id: req.params.id
        });
    }
});

export default router;