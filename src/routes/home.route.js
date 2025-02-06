import express from 'express';
import { CONFIG } from '../config.js';

const router = express.Router();

// Rota principal que exibe a página de instalação do addon
router.get('/', (req, res) => {
    // Detecta o protocolo usado
    const protocol = req.secure ? 'https' : 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    
    // Constrói as URLs de instalação
    const manifestUrl = `${protocol}://${host}/manifest.json`;
    const installUrl = `stremio://${host}/manifest.json`;

    // Retorna a página HTML com as instruções de instalação
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
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Instalação do Addon Subtirrent</h1>
            <p>Clique no botão abaixo para instalar o Subtirrent no Stremio:</p>
            <a href="${installUrl}" class="install-link">Instalar Addon</a>
            <p>Ou copie e cole esta URL no Stremio:</p>
            <div class="manifest-url">${manifestUrl}</div>
            <p>
                Este addon extrai legendas embutidas de torrents que você está assistindo usando 
                sua conta do AllDebrid.
            </p>
            <div class="status">
                <h2>Status</h2>
                <p>AllDebrid: ${CONFIG.alldebrid.apiKey ? '✅ Configurado' : '❌ Não configurado'}</p>
            </div>
        </div>
    </body>
    </html>`;

    res.send(html);
});

export default router;