import express from 'express';
import { TorrentService, SubtitleService } from './services.js';
import { SERVER_CONFIG } from './config.js';

const router = express.Router();

router.get('/subtitles/:id', async (req, res) => {
  try {
    const [infoHash, trackIndex] = req.params.id.split(':');
    const cached = SubtitleService.getCachedSubtitle(req.params.id);
    
    if (!cached || cached.infoHash !== infoHash) {
      return res.status(404).json({
        error: 'Subtitle not found or expired',
        cacheStats: SubtitleService.getCacheStats()
      });
    }

    const torrent = TorrentService.getTorrent(infoHash);
    if (!torrent) {
      return res.status(410).json({
        error: 'Torrent session expired',
        infoHash,
        activeTorrents: TorrentService.getActiveTorrentsCount()
      });
    }

    const server = torrent.files[0].createServer();
    await new Promise(resolve => server.listen(0, resolve));
    
    const inputUrl = `${SERVER_CONFIG.baseUrl}:${server.address().port}`;
    
    res.header('Content-Type', 'text/vtt');
    
    SubtitleService.convertToVTT(inputUrl, trackIndex)
      .on('error', err => {
        console.error('FFmpeg error:', err);
        server.close();
        res.status(500).json({
          error: 'Subtitle conversion failed',
          details: err.message
        });
      })
      .on('end', () => server.close())
      .pipe(res);

  } catch (error) {
    console.error('Subtitle route error:', error);
    res.status(500).json({
      error: 'Internal server error',
      requestId: req.id,
      details: error.message
    });
  }
});

export default router;