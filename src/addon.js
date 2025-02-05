import { addonBuilder } from 'stremio-addon-sdk';
import { MANIFEST, SERVER_CONFIG } from './config.js';
import { TorrentService, SubtitleService } from './services.js';

const builder = new addonBuilder(MANIFEST);

builder.defineSubtitlesHandler(async ({ id, extra }) => {
  try {
    // Divide o ID para obter o IMDB ID e o índice do arquivo
    // Exemplo: se id = "tt1234567:2", então imdbId = "tt1234567" e fileIndex = "2"
    // O fileIndex é importante quando o torrent tem múltiplos arquivos de vídeo
    const [imdbId, fileIndex] = id.split(':');
    
    // Obtém o magnet URI dos dados extras que o Stremio fornece
    // Quando um torrent está sendo reproduzido, o Stremio passa esta informação 
    // automaticamente para os addons de legenda
    const magnetUri = extra?.magnetUri;
    
    if (!magnetUri) {
      console.log('Nenhum magnet URI fornecido - não há stream de torrent ativo');
      return { subtitles: [] };
    }

    // Conecta ao torrent que está sendo reproduzido no Stremio
    // Não precisamos baixar o torrent inteiro, apenas o suficiente para analisá-lo
    // O TorrentService vai gerenciar esta conexão para nós
    const torrent = await TorrentService.addTorrent(magnetUri);
    
    // Obtém o arquivo de vídeo específico do torrent
    // Usa fileIndex se fornecido, caso contrário usa o primeiro arquivo (índice 0)
    // Isso é importante para torrents que contêm múltiplos episódios
    const videoFile = torrent.files[fileIndex || 0];
    
    if (!videoFile) {
      console.log('Nenhum arquivo de vídeo encontrado no torrent');
      return { subtitles: [] };
    }

    // Cria um servidor HTTP temporário para servir o arquivo de vídeo
    // Isso é necessário porque o FFmpeg precisa de acesso HTTP para analisar o arquivo
    // O servidor será usado apenas durante a análise do arquivo
    const server = videoFile.createServer();
    
    // Inicia o servidor em uma porta aleatória disponível
    // Usamos uma porta aleatória para evitar conflitos com outros serviços
    await new Promise(resolve => server.listen(0, resolve));
    
    // Usa o FFmpeg para analisar o arquivo de vídeo e encontrar faixas de legenda
    // O FFmpeg vai examinar o arquivo e identificar todas as legendas embutidas
    const tracks = await SubtitleService.probeSubtitles(
      `http://localhost:${server.address().port}`
    );
    
    // Converte cada faixa de legenda para o formato que o Stremio espera
    // O Stremio precisa de informações específicas sobre cada legenda
    const subtitles = tracks
      // Filtra apenas as faixas que são realmente legendas
      .filter(stream => stream.codec_type === 'subtitle')
      .map((track, index) => {
        // Obtém o código do idioma dos metadados da faixa
        // Se não houver idioma definido, usa 'und' (undefined/indefinido)
        const lang = track.tags?.language || 'und';
        
        // Cria um ID único para esta faixa de legenda
        // Este ID será usado depois quando o Stremio solicitar o conteúdo da legenda
        const subId = `${torrent.infoHash}:${index}`;
        
        // Armazena as informações da legenda em nosso cache
        // Isso nos ajuda a recuperar essas informações depois
        // quando o Stremio solicitar a legenda
        SubtitleService.cacheSubtitle(subId, {
          infoHash: torrent.infoHash,
          trackIndex: index,
          language: lang
        });

        // Retorna as informações da legenda no formato que o Stremio espera
        return {
          id: subId,                                          // Identificador único desta legenda
          url: `${SERVER_CONFIG.baseUrl}/subtitles/${subId}`, // URL onde o Stremio pode obter a legenda
          lang: SubtitleService.validateLanguageCode(lang),   // Código do idioma (ISO 639-1)
          name: SubtitleService.getLanguageName(lang)         // Nome do idioma legível para humanos
        };
      });

    // Limpa recursos fechando o servidor temporário
    // Importante fazer isso para não deixar servidores abandonados
    server.close();

    // Retorna a lista de legendas disponíveis para o Stremio
    return { subtitles };
    
  } catch (error) {
    // Registra quaisquer erros que ocorram durante o processo
    // Isso é importante para debug e monitoramento
    console.error('Erro no manipulador de legendas:', error);
    
    // Retorna uma lista vazia se algo der errado
    // Isso garante que o Stremio continue funcionando mesmo se encontrarmos um erro
    return { subtitles: [] };
  }
});

export const addonInterface = builder.getInterface();