import express from 'express';
import StremioPkg from 'stremio-addon-sdk';
const { getRouter } = StremioPkg;
import { addonInterface } from '../addon.js';
import HealthRoute from './health.route.js';
import HomeRoute from './home.route.js';
import SubtitleRoute from './subtitle.route.js';

const router = express.Router();

// Middleware para servir conteúdo estático e processar requisições
router.use(express.static('public')); // Para arquivos estáticos se necessário
router.use(express.urlencoded({ extended: true })); // Para dados de formulário
router.use(express.json()); // Para requisições JSON

// Middleware para logging de requisições
router.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Middleware para CORS
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    next();
});

// Configuração de tipos de conteúdo específicos
router.use((req, res, next) => {
    // Se a rota é a página inicial, garante que será interpretada como HTML
    if (req.path === '/') {
        res.type('html');
    }
    next();
});

// Rotas do Stremio
router.use(getRouter(addonInterface));

// Nossas rotas customizadas
router.use(HomeRoute);      // Página inicial
router.use(SubtitleRoute);  // Endpoints de legenda
router.use(HealthRoute);    // Endpoints de monitoramento

// Handler para rotas não encontradas
router.use((req, res) => {
    res.status(404).json({ 
        error: 'Not Found',
        message: 'O endpoint solicitado não existe'
    });
});

// Handler para erros
router.use((err, req, res, next) => {
    console.error('Erro na rota:', err);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: err.message
    });
});

export default router;