/**
 * @file src/routes/index.js
 * @description Roteador principal do addon.
 * 
 * Esse arquivo configura os middlewares básicos e define uma rota que extrai o
 * parâmetro de configuração (user data) do primeiro segmento da URL.
 * Agora, além de atribuir o valor a req.extra.config, injetamos esse valor na query string
 * (req.query.config) para que o SDK do Stremio o inclua automaticamente no objeto extra.
 */

import express from 'express';
import { MANIFEST } from '../config.js';
import HealthRoute from './health.route.js';
import HomeRoute from './home.route.js';
import SubtitleRoute from './subtitle.route.js';

const router = express.Router();

// --- Middlewares básicos ---
router.use(express.static('public'));
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

router.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

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

router.use((req, res, next) => {
  if (req.path === '/') {
    res.type('html');
  }
  next();
});

router.get('/:token/manifest.json', (req, res) => {
  res.json(MANIFEST);
});

// --- Rotas customizadas ---
router.use(HomeRoute);
router.use(SubtitleRoute);
router.use(HealthRoute);

// --- Handlers de erro ---
router.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'O endpoint solicitado não existe'
  });
});

router.use((err, req, res, next) => {
  console.error('Erro na rota:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

export default router;