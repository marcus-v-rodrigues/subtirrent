/**
 * @file src/routes/home.route.js
 * @description Rota para a página de configuração do addon.
 *
 * Essa página permite que o usuário insira sua API key e escolha o formato das legendas.
 * O formulário gera, via JavaScript, um link de instalação no formato:
 *   stremio://<host>/<configBase64>/manifest.json
 * 
 * Assim, os dados do usuário serão passados diretamente na URL do addon.
 */

import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
    res.redirect('/configure');
});

router.get('/configure', (req, res) => {
  // Configuração padrão para preencher os inputs
  // API key é deixada vazia para forçar o usuário a inserir o valor
  const defaultConfig = {
    alldebrid: {
      apiKey: ''  
    },
    subtitle: {
      format: 'srt'  // Valor sugerido; o usuário pode escolher entre "srt" e "vtt"
    }
  };

  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instalação do Addon Subtirrent</title>
    <style>
      /* Estilos básicos para a página */
      body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 20px;
          background: #f0f4f8;
      }
      .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white;
          padding: 2rem;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .manifest-url { 
          word-break: break-all; 
          padding: 12px;
          background: #f8fafc; 
          border-radius: 5px; 
          margin: 15px 0;
      }
      .config-form {
          margin: 2rem 0;
          text-align: left;
      }
      .form-group {
          margin-bottom: 1rem;
      }
      label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
      }
      input[type="text"],
      select {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 0.5rem;
      }
      .save-button, .install-button {
          background: #10b981;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
      }
      .save-button:hover, .install-button:hover {
          background: #059669;
      }
      .status {
          margin-top: 2rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 5px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Instalação do Addon Subtirrent</h1>
      
      <div class="config-form">
        <h2>Configurações</h2>
        <form id="configForm">
          <div class="form-group">
            <label for="apiKey">Chave da API AllDebrid:</label>
            <input 
                type="text" 
                id="apiKey" 
                name="apiKey" 
                value="${defaultConfig.alldebrid.apiKey}"
                placeholder="Cole sua chave aqui"
                required
            >
          </div>
          
          <div class="form-group">
            <label for="format">Formato das Legendas:</label>
            <select id="format" name="format">
              <option value="srt" ${defaultConfig.subtitle.format === 'srt' ? 'selected' : ''}>
                  SRT (Melhor compatibilidade TV)
              </option>
              <option value="vtt" ${defaultConfig.subtitle.format === 'vtt' ? 'selected' : ''}>
                  WebVTT (Melhor compatibilidade web)
              </option>
            </select>
          </div>
          
          <button type="submit" class="save-button">Gerar Link de Instalação</button>
        </form>
      </div>
      
      <p>Ou copie e cole esta URL no Stremio:</p>
      <div class="manifest-url" id="manifestUrl"></div>
      
      <!-- Botão para abrir o Stremio diretamente -->
      <button id="installButton" class="install-button" style="display:none;">Instalar Addon no Stremio</button>
      
      <div class="status">
          <h2>Status</h2>
          <p>AllDebrid: <span id="statusApiKey">❌ Não configurado</span></p>
          <p>Formato: <span id="statusFormat">${defaultConfig.subtitle.format === 'srt' ? 'SRT' : 'WebVTT'}</span></p>
      </div>
    </div>
    
    <script>
      // Ao submeter o formulário, gera a string base64 com os dados e constrói o link de instalação
      const form = document.getElementById('configForm');
      const manifestUrlDiv = document.getElementById('manifestUrl');
      const installButton = document.getElementById('installButton');

      form.addEventListener('submit', function(e) {
        e.preventDefault();
        // Captura os valores inseridos pelo usuário
        const apiKey = document.getElementById('apiKey').value;
        const format = document.getElementById('format').value;
        // Cria o objeto de configuração
        const config = {
          alldebrid: {
            apiKey: apiKey,
            enabled: true
          },
          subtitle: {
            format: format,
            preferredLanguages: ['eng', 'por'],
            convertToUtf8: true,
            cacheTimeout: 1800
          }
        };
        console.log("Config gerada:", config);
        // Serializa e codifica em base64
        const configString = btoa(JSON.stringify(config));
        // Use encodeURIComponent para garantir que a string possa ser usada na URL
        const encodedConfig = encodeURIComponent(configString);
        // Gera o link de instalação, colocando o token de configuração no caminho
        const installUrl = 'stremio://' + window.location.host + '/' + encodedConfig + '/manifest.json';
        
        manifestUrlDiv.textContent = installUrl;
        // Atualiza o status visual
        document.getElementById('statusApiKey').textContent = apiKey ? '✅ Configurado' : '❌ Não configurado';
        document.getElementById('statusFormat').textContent = format === 'srt' ? 'SRT' : 'WebVTT';
        
        // Mostra o botão de instalação com o link configurado
        installButton.style.display = 'inline-block';
        installButton.onclick = function() {
          window.location.href = installUrl;
        };
      });
    </script>
  </body>
  </html>
  `;
  res.send(html);
});

export default router;