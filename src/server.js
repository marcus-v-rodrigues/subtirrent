import express from 'express';
import stremioSDK from 'stremio-addon-sdk';
const { getRouter } = stremioSDK;
import { SERVER_CONFIG, CACHE_CONFIG } from './config.js';
import { TorrentService } from './services.js';
import { addonInterface } from './addon.js';
import routes from './routes.js';

const app = express();

// Configuração mais robusta de CORS e middlewares
app.use((req, res, next) => {
    // Permitimos todas as origens porque o Stremio pode estar rodando em diferentes portas
    res.header('Access-Control-Allow-Origin', '*');
    
    // Headers necessários para comunicação adequada com o Stremio
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Tratamento especial para requisições OPTIONS que o Stremio faz
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Log de todas as requisições para ajudar no diagnóstico de problemas
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Middleware para garantir que as respostas tenham o tipo correto
app.use((req, res, next) => {
    if (req.url.endsWith('.json')) {
        res.type('application/json');
    }
    next();
});

// Rotas do Stremio - precisam vir antes das nossas rotas customizadas
app.use(getRouter(addonInterface));

// Nossas rotas customizadas
app.use(routes);

// Página inicial melhorada com detecção automática de protocolo e host
app.get('/', (req, res) => {
    // Detectamos se estamos usando HTTPS
    const protocol = req.secure ? 'https' : 'http';
    
    // Obtemos o host real, considerando proxies
    const host = req.headers['x-forwarded-host'] || req.get('host');
    
    // Construímos as URLs de instalação
    const addonUrl = `${protocol}://${host}/manifest.json`;
    const addonInstallUrl = `stremio://${host}/manifest.json`;

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
              transition: background 0.3s ease;
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
              border: 1px solid #e2e8f0;
              font-family: monospace;
          }
          h1 {
              color: #1e293b;
              margin-bottom: 1.5rem;
          }
          p {
              color: #475569;
              margin-bottom: 1rem;
          }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Instalação do Addon Subtirrent</h1>
            <p>Clique no botão abaixo para instalar o Subtirrent no Stremio:</p>
            <a href="${addonInstallUrl}" class="install-link">Instalar Addon</a>
            <p>Ou copie e cole esta URL no Stremio:</p>
            <div class="manifest-url">${addonUrl}</div>
            <p>Este addon extrai legendas embutidas de torrents em tempo real e as converte para o formato VTT.</p>
            <div class="troubleshooting">
                <h2>Problemas na instalação?</h2>
                <p>Tente estas URLs alternativas:</p>
                <ul>
                    <li>Local: <code>stremio://127.0.0.1:${SERVER_CONFIG.port}/manifest.json</code></li>
                    <li>Rede: <code>stremio://192.168.1.xxx:${SERVER_CONFIG.port}/manifest.json</code></li>
                </ul>
            </div>
        </div>
    </body>
    </html>
    `;
    res.send(html);
});

// Rota para verificar a saúde do servidor
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Date.now()
    });
});

// Inicialização mais robusta do servidor
const server = app.listen(SERVER_CONFIG.port, '0.0.0.0', () => {
    console.log(`Addon iniciado em: http://localhost:${SERVER_CONFIG.port}`);
    console.log(`Manifest URL: http://localhost:${SERVER_CONFIG.port}/manifest.json`);
    console.log(`URL de instalação direta: stremio://localhost:${SERVER_CONFIG.port}/manifest.json`);
    
    // Verificamos se a porta está realmente disponível
    const address = server.address();
    console.log(`Servidor escutando em: ${address.address}:${address.port}`);
});

// Tratamento de erros do servidor
server.on('error', (error) => {
    console.error('Erro no servidor:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`A porta ${SERVER_CONFIG.port} já está em uso. Tente outra porta.`);
        process.exit(1);
    }
});

// Sistema de limpeza periódica mais robusto
const cleanup = () => {
    try {
        TorrentService.cleanup();
        console.log('Limpeza periódica executada com sucesso');
    } catch (error) {
        console.error('Erro durante a limpeza:', error);
    }
};

setInterval(cleanup, CACHE_CONFIG.ttl);

// Gerenciamento de shutdown mais completo
const gracefulShutdown = () => {
    console.log('Iniciando desligamento gracioso...');
    server.close(() => {
        console.log('Servidor HTTP fechado.');
        try {
            TorrentService.cleanup();
            console.log('Recursos limpos com sucesso.');
            process.exit(0);
        } catch (error) {
            console.error('Erro durante o desligamento:', error);
            process.exit(1);
        }
    });

    // Força o encerramento após 30 segundos
    setTimeout(() => {
        console.error('Timeout durante o desligamento gracioso, forçando saída');
        process.exit(1);
    }, 30000);
};

// Tratamento de diversos sinais de término
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('uncaughtException', (error) => {
    console.error('Erro não tratado:', error);
    gracefulShutdown();
});