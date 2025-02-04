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

// Rota raiz para teste
app.get('/', (req, res) => {
  res.send('Subtirrent Addon is running');
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