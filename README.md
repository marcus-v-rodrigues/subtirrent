# Subtirrent

Um addon para o Stremio que extrai automaticamente legendas embutidas de arquivos de vídeo sendo reproduzidos via torrent usando AllDebrid.

## 🌟 Características

- Extrai legendas embutidas dos arquivos de vídeo em tempo real
- Suporte a diversos formatos de legenda (SRT, SSA/ASS, etc.)
- Conversão automática para WebVTT ou SRT
- Detecção automática de idioma
- Integração com AllDebrid para processamento rápido
- Interface web para configuração
- Cache inteligente para melhor performance

## 📋 Pré-requisitos

- Node.js 16.x ou superior
- FFmpeg instalado no sistema
- Conta AllDebrid (gratuita ou premium)
- Chave de API do AllDebrid

## 🚀 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/subtirrent.git
cd subtirrent
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
PORT=7000
BASE_URL=http://localhost:7000
```

4. Inicie o servidor:
```bash
npm start
```

## ⚙️ Configuração

1. Acesse a interface web do addon em `http://localhost:7000`
2. Insira sua chave de API do AllDebrid
3. Selecione o formato de legenda preferido (WebVTT ou SRT)
4. Clique em "Salvar Configurações"
5. Use o botão "Instalar Addon" ou copie a URL do manifest para instalar no Stremio

## 🔧 Como Funciona

1. O Stremio envia para o addon informações sobre o vídeo sendo reproduzido
2. O addon usa o AllDebrid para localizar o arquivo específico
3. O FFmpeg analisa o arquivo em busca de legendas embutidas
4. As legendas são extraídas e convertidas para o formato configurado
5. O Stremio recebe a legenda e a exibe durante a reprodução

## 🌐 Endpoints

- `/` - Interface web para configuração
- `/manifest.json` - Manifest do addon para o Stremio
- `/subtitles/:id` - Endpoint de legendas
- `/health` - Status do servidor e configurações

## 🏗️ Estrutura do Projeto

```
src/
├── handlers/          # Manipuladores de requisições
├── routes/           # Rotas da API
├── services/         # Serviços e lógica de negócio
├── addon.js          # Configuração do addon Stremio
├── config.js         # Configurações gerais
└── server.js         # Servidor Express
```

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## ❓ Suporte

- Abra uma issue para reportar bugs
- Entre em contato via [email](mailto:seu-email@example.com) para suporte
- Consulte a [Wiki](wiki) para mais informações

## 🙏 Agradecimentos

- Equipe do Stremio pelo excelente SDK
- AllDebrid pela API robusta
- Comunidade open source pelas bibliotecas utilizadas

## ⚠️ Aviso Legal

Este addon não hospeda, armazena ou distribui nenhum conteúdo protegido por direitos autorais. Ele apenas facilita o acesso a legendas já presentes nos arquivos sendo reproduzidos pelo usuário.