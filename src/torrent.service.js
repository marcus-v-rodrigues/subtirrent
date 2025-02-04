import WebTorrent from 'webtorrent';
import { SERVER_CONFIG } from './config.js';

const client = new WebTorrent({
  tracker: { wrtc: false },
  dht: false,
  webSeeds: false,
  port: SERVER_CONFIG.torrentPorts.start
});

export const TorrentService = {
  addTorrent: (magnet) => new Promise((resolve, reject) => {
    const torrent = client.add(magnet, { destroyStoreOnDestroy: true });
    
    torrent.on('ready', () => resolve(torrent));
    torrent.on('error', reject);
    torrent.on('done', () => torrent.destroy());
  }),

  getTorrent: (infoHash) => client.torrents.find(t => t.infoHash === infoHash),

  cleanup: () => {
    client.torrents.forEach(torrent => {
      if (torrent.done || torrent.progress === 1) {
        torrent.destroy();
      }
    });
  }
};