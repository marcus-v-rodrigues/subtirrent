import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Como estamos usando ES Modules, definimos __dirname:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get('/', (req, res) => {
  res.redirect('/configure');
});

router.get('/configure', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/configure.html'));
});

export default router;