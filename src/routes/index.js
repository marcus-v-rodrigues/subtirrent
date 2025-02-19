import express from 'express';
import HealthRoute from './health.route.js';
import HomeRoute from './home.route.js';
import SubtitleRoute from './subtitle.route.js';
import StreamRoute from './stream.route.js';
import CatalogRoute from './catalog.route.js';

const router = express.Router();

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
  next();
});

// Rota para o manifest: /:token/manifest.json
router.get('/:token/manifest.json', (req, res) => {
  import('../config.js').then(({ MANIFEST }) => {
    res.json(MANIFEST);
  }).catch((err) => {
    console.error('Erro ao carregar manifest:', err);
    res.status(500).json({ error: 'Erro interno' });
  });
});

router.use(HomeRoute);
router.use(CatalogRoute); 
router.use(SubtitleRoute);
router.use(StreamRoute);
router.use(HealthRoute);

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
