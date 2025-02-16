import express from 'express';
import { SERVER_CONFIG } from './config.js';
import routes from './routes/index.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(routes);

// Inicializa o servidor
const server = app.listen(SERVER_CONFIG.port, '0.0.0.0', () => {
    const address = server.address();
    console.log(`
Addon iniciado em:
- Local: http://localhost:${address.port}
- Manifest: http://localhost:${address.port}/manifest.json
- Instalação: stremio://localhost:${address.port}/manifest.json
    `);
});

// Tratamento de erros do servidor
server.on('error', (error) => {
    console.error('Erro no servidor:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`A porta ${SERVER_CONFIG.port} já está em uso`);
        process.exit(1);
    }
});

// Gerenciamento de shutdown
const gracefulShutdown = () => {
    console.log('Iniciando desligamento gracioso...');
    server.close(() => {
        console.log('Servidor HTTP fechado');
        process.exit(0);
    });

    // Força o encerramento após 30 segundos
    setTimeout(() => {
        console.error('Timeout durante o desligamento gracioso');
        process.exit(1);
    }, 30000);
};

// Tratamento de sinais de término
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);