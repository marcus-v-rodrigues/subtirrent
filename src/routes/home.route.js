import express from 'express';
import { CONFIG } from '../config.js';

const router = express.Router();

// Rota para salvar configurações
router.post('/config', (req, res) => {
    try {
        // Atualiza as configurações em memória
        CONFIG.alldebrid.apiKey = req.body.apiKey;
        CONFIG.subtitle.format = req.body.format;
        
        console.log('✅ Configurações atualizadas:', {
            hasApiKey: !!CONFIG.alldebrid.apiKey,
            format: CONFIG.subtitle.format
        });
        
        res.redirect('/');
    } catch (error) {
        console.error('❌ Erro ao salvar configurações:', error);
        res.status(500).send('Erro ao salvar configurações');
    }
});

// Rota principal que exibe a página de instalação do addon
router.get('/', (req, res) => {
    const protocol = req.secure ? 'https' : 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    
    const manifestUrl = `${protocol}://${host}/manifest.json`;
    const installUrl = `stremio://${host}/manifest.json`;

    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Instalação do Addon Subtirrent</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 20px;
                background: #f0f4f8;
            }
            .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background: white;
                padding: 2rem;
                border-radius: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .install-link { 
                display: inline-block; 
                padding: 12px 24px; 
                background: #2563eb; 
                color: white; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 20px 0;
            }
            .install-link:hover { 
                background: #1d4ed8; 
            }
            .manifest-url { 
                word-break: break-all; 
                padding: 12px;
                background: #f8fafc; 
                border-radius: 5px; 
                margin: 15px 0;
            }
            .config-form {
                margin: 2rem 0;
                text-align: left;
            }
            .form-group {
                margin-bottom: 1rem;
            }
            label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: bold;
            }
            input[type="text"],
            select {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-bottom: 0.5rem;
            }
            .save-button {
                background: #10b981;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
            }
            .save-button:hover {
                background: #059669;
            }
            .status {
                margin-top: 2rem;
                padding: 1rem;
                background: #f8fafc;
                border-radius: 5px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Instalação do Addon Subtirrent</h1>
            
            <div class="config-form">
                <h2>Configurações</h2>
                <form action="/config" method="POST">
                    <div class="form-group">
                        <label for="apiKey">Chave da API AllDebrid:</label>
                        <input 
                            type="text" 
                            id="apiKey" 
                            name="apiKey" 
                            value="${CONFIG.alldebrid.apiKey || ''}"
                            placeholder="Cole sua chave aqui"
                            required
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="format">Formato das Legendas:</label>
                        <select id="format" name="format">
                            <option value="vtt" ${CONFIG.subtitle.format === 'vtt' ? 'selected' : ''}>
                                WebVTT (Melhor compatibilidade web)
                            </option>
                            <option value="srt" ${CONFIG.subtitle.format === 'srt' ? 'selected' : ''}>
                                SRT (Melhor compatibilidade TV)
                            </option>
                        </select>
                    </div>

                    <button type="submit" class="save-button">Salvar Configurações</button>
                </form>
            </div>

            <p>Clique no botão abaixo para instalar o Subtirrent no Stremio:</p>
            <a href="${installUrl}" class="install-link">Instalar Addon</a>
            
            <p>Ou copie e cole esta URL no Stremio:</p>
            <div class="manifest-url">${manifestUrl}</div>
            
            <div class="status">
                <h2>Status</h2>
                <p>AllDebrid: ${CONFIG.alldebrid.apiKey ? '✅ Configurado' : '❌ Não configurado'}</p>
                <p>Formato: ${CONFIG.subtitle.format === 'vtt' ? 'WebVTT' : 'SRT'}</p>
            </div>
        </div>
    </body>
    </html>`;

    res.send(html);
});

export default router;