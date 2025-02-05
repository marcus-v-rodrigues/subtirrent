import express from 'express';
import stremioSDK from 'stremio-addon-sdk';
const { getRouter } = stremioSDK;
import { SERVER_CONFIG, CACHE_CONFIG } from './config.js';
import { TorrentService } from './services.js';
import { addonInterface } from './addon.js';
import routes from './routes.js';

const app = express();

// Middlewares
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Rota do Stremio
app.use(getRouter(addonInterface));

// Nossas rotas customizadas
app.use(routes);

// Nova rota raiz para instalação
app.get('/', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const addonUrl = `${protocol}://${host}/manifest.json`;
  const addonInstallUrl = `stremio://${host}/manifest.json`;
  
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subtirrent Addon Installation</title>
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
        <h1>Subtirrent Addon Installation</h1>
        <p>Click the button below to install the Subtirrent Addon in Stremio:</p>
        <a href="${addonInstallUrl}" class="install-link">Install Addon</a>
        <p>Or copy and paste this URL into Stremio:</p>
        <div class="manifest-url">${addonUrl}</div>
        <p>This addon extracts embedded subtitles from torrents in real time and converts them to VTT format.</p>
    </div>
  </body>
  </html>
    `;
  res.send(html);
});

// Inicialização
const server = app.listen(SERVER_CONFIG.port, () => {
  console.log(`Addon running on port ${SERVER_CONFIG.port}`);
  console.log(`Stremio manifest: http://localhost:${SERVER_CONFIG.port}/manifest.json`);
});

// Limpeza periódica
setInterval(() => {
  TorrentService.cleanup();
}, CACHE_CONFIG.ttl);

// Gerenciamento de shutdown
process.on('SIGINT', () => {
  server.close(() => {
    TorrentService.cleanup();
    process.exit(0);
  });
});