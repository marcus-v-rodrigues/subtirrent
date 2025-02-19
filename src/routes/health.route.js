import express from 'express';
import { CONFIG, MANIFEST } from '../config.js';

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: MANIFEST.version,
    uptime: process.uptime(),
    timestamp: Date.now(),
    alldebrid: {
      enabled: !!CONFIG.alldebrid.apiKey,
      configured: !!CONFIG.alldebrid.apiKey
    }
  });
});

export default router;
