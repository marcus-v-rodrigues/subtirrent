import express from 'express';
import { CONFIG } from '../config.js';

const router = express.Router();

// Rota para verificar o status do servidor
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        version: CONFIG.version,
        uptime: process.uptime(),
        timestamp: Date.now(),
        alldebrid: {
            enabled: !!CONFIG.alldebrid.apiKey,
            configured: !!CONFIG.alldebrid.apiKey
        }
    });
});

export default router;