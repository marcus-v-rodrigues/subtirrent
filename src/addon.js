import { addonBuilder } from 'stremio-addon-sdk';
import { MANIFEST, SERVER_CONFIG } from './config.js';
import { TorrentService, SubtitleService } from './services.js';

const builder = new addonBuilder(MANIFEST);

builder.defineSubtitlesHandler(async ({ id, extra }) => {
  try {
    const [imdbId, fileIndex] = id.split(':');
    const magnetUri = extra?.magnetUri;
    
    if (!magnetUri) return { subtitles: [] };

    const torrent = await TorrentService.addTorrent(magnetUri);
    const videoFile = torrent.files[fileIndex || 0];
    if (!videoFile) return { subtitles: [] };

    const server = videoFile.createServer();
    await new Promise(resolve => server.listen(0, resolve));
    
    const tracks = await SubtitleService.probeSubtitles(
      `http://localhost:${server.address().port}`
    );
    
    server.close();

    const subtitles = tracks
      .filter(stream => stream.codec_type === 'subtitle')
      .map((track, index) => {
        const lang = track.tags?.language || 'und';
        const subId = `${torrent.infoHash}:${index}`;
        
        SubtitleService.cacheSubtitle(subId, {
          infoHash: torrent.infoHash,
          trackIndex: index,
          language: lang
        });

        return {
          id: subId,
          url: `${SERVER_CONFIG.baseUrl}/subtitles/${subId}`,
          lang: SubtitleService.validateLanguageCode(lang),
          name: SubtitleService.getLanguageName(lang)
        };
      });

    return { subtitles };
  } catch (error) {
    console.error('Subtitle handler error:', error);
    return { subtitles: [] };
  }
});

export const addonInterface = builder.getInterface();