# 📄 Background Email Server

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
[![Fastify](https://img.shields.io/badge/Fastify-4.0+-000000?style=for-the-badge&logo=fastify&logoColor=white)](https://www.fastify.io/)
![Redis](https://img.shields.io/badge/Redis-Queue-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Bull](https://img.shields.io/badge/Bull-Jobs-FF6B6B?style=for-the-badge&logo=bullmq&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white)
[![JWT](https://img.shields.io/badge/JWT-Auth-black?style=for-the-badge&logo=JSON%20web%20tokens)](https://jwt.io/)
![ESLint](https://img.shields.io/badge/Code%20Quality-ESLint%20%2B%20Prettier-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)

![API Version](https://img.shields.io/badge/API-v1.0-FF6B6B?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

> **Boilerplate completo** para sistema de envio de emails em lote executado em background, desenvolvido para processar grandes volumes de mensagens de forma eficiente e assíncrona. Ideal como base para projetos que necessitam de processamento de emails em background.

## 🚀 Características

- **Processamento em Background**: Envio assíncrono de emails sem bloquear a aplicação principal
- **Sistema de Filas Redis/Bull**: Gerenciamento eficiente de grandes volumes de emails
- **Retry Logic**: Reenvio automático em caso de falhas
- **Rate Limiting**: Controle de taxa de envio para evitar bloqueios do provedor SMTP
- **Persistência Local**: Sistema de armazenamento em arquivo JSON (`data/data.json`)
- **Monitoramento Visual**: Dashboard Bull Board para acompanhar status dos envios
- **Logs Detalhados**: Sistema completo de auditoria e rastreamento de jobs
- **Autenticação JWT**: Sistema de autenticação seguro
- **CORS Configurável**: Controle flexível de origens permitidas

## 🛠 Tecnologias

- **Backend**: Node.js 20+ com Fastify
- **Linguagem**: TypeScript 5.0+
- **Persistência**: Arquivo local JSON *(Banco de dados será integrado em futuras versões)*
- **Sistema de Filas**: Redis + Bull Queue
- **Autenticação**: JWT (JSON Web Tokens)
- **Containerização**: Docker & Docker Compose
- **Monitoramento**: Bull Board Dashboard
- **Qualidade de Código**: ESLint + Prettier + Husky

## 📋 Pré-requisitos

- Node.js (versão 20 ou superior)
- npm ou pnpm
- Docker (para containerização)
- Redis (incluído no Docker Compose)

## 📦 Instalação

### Usando Docker (Recomendado)

```bash
# Clonar o repositório
git clone https://github.com/RichardLirio/background_email_server.git
cd background_email_server

# Copiar arquivo de configuração
cp .env.example .env

# Configurar variáveis de ambiente (veja seção de configuração)
# Edite o arquivo .env com suas configurações

# Iniciar em modo desenvolvimento
docker-compose up -d

# Iniciar em modo produção
docker-compose -f docker-compose.prod.yml up --build
```

### Instalação Manual

```bash
# Clonar o repositório
git clone https://github.com/RichardLirio/background_email_server.git
cd background_email_server

# Instalar dependências
npm install
# ou usando pnpm
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env

# Iniciar Redis localmente (ou usar Docker)
redis-server

# Iniciar o servidor
npm run dev
```

## ⚙️ Configuração

Configure as seguintes variáveis no arquivo `.env`:

```env
# Configurações JWT (obrigatório em produção)
JWT_SECRET=seu-jwt-secret-super-seguro-com-pelo-menos-32-caracteres
JWT_EXPIRES_IN=1d

# Rate Limiting
RATE_LIMIT_MAX=100

# CORS (separar múltiplas origens por vírgula)
CORS_ORIGINS=http://localhost:3333,http://localhost:3001

# Configurações Redis
REDIS_PASSWORD=passwordredis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Configurações SMTP
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=seu-email@gmail.com
MAIL_PASS=sua-senha-de-app
```

### ⚠️ Importante: Persistência de Dados

Este projeto utiliza persistência local através do arquivo `data/data.json` para armazenar informações dos jobs e clientes. Esta abordagem foi escolhida para manter o boilerplate simples e funcional.

**Futuras versões incluirão:**
- Integração com bancos de dados relacionais (PostgreSQL, MySQL)
- Integração com bancos NoSQL (MongoDB, Redis como DB)
- Sistema de migração de dados
- Backup automático dos dados locais

### Personalização do Template de Email

Para personalizar o corpo do email:

1. Edite o arquivo `public/example.html` 
2. Renomeie para `public/index.html`
3. O sistema utilizará automaticamente este arquivo como template

## 🎯 Uso Prático

### Autenticação

Primeiro, registre-se:

```bash
curl -X POST http://localhost:3333/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Example Enterprise Admin LTDA", "secret": "Admin@1234", "scopes": ["read", "write", "admin"]}'
```

Agora obtenha um token JWT:

```bash
curl -X POST http://localhost:3333/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"client_id": "{{client_id}}", "client_secret":"Admin@103256"}'
```


### Enviando Emails em Lote

```bash
curl -X POST http://localhost:3000/mail/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -d ' 
      [
        {
          "from": {
            "name": "Sistema de Cobrança",
            "email": "example@example.com.br"
          },
          "to": {
            "name": "Cliente 1",
            "email": "cliente1@hotmail.com"
          },
          "cc": {
            "name": "Financeiro",
            "email": "financeiro@example.com.br"
          },
          "subject": "Fatura #4"
        },
        {
          "from": {
            "name": "Sistema de Cobrança",
            "email": "example@example.com.br"
          },
          "to": {
            "name": "Cliente 2",
            "email": "cliente2@hotmail.com"
          },
          "cc": {
            "name": "Financeiro",
            "email": "financeiro@example.com.br"
          },
          "subject": "Fatura #5"
        },
      ]
      
```

### Monitoramento com Bull Board

Acesse o dashboard em: `http://localhost:3333/admin/queues`

- Visualize jobs em tempo real
- Monitore falhas e retentativas
- Acompanhe estatísticas de performance
- Gerencie jobs manualmente

## 📡 API Endpoints

### Autenticação
```http
POST /auth/token           # Fazer login e obter JWT token
```

### Envio de Emails
```http
POST /emails/batch               # Enviar lote de emails
GET  /emails/job/:jobId          # Verificar status de um job específico
GET  /emails/stats               # Estatísticas gerais dos envios
```

### Monitoramento
```http
GET  /admin/queues               # Dashboard Bull Board
GET  /health                     # Health check da aplicação
```

### Exemplo de Payload para Envio em Lote

```json

[
  {
    "from": {
      "name": "Sistema de Cobrança",
      "email": "example@example.com.br"
    },
    "to": {
      "name": "Cliente 1",
      "email": "cliente1@hotmail.com"
    },
    "cc": {
      "name": "Financeiro",
      "email": "financeiro@example.com.br"
    },
    "subject": "Fatura #4"
  }
]

```

## 🏗️ Estrutura do Projeto

```
background_email_server/
├── public/
│   └── example.html              # Template de email (renomeie para index.html)
├── src/
│   ├── app.ts                    # Configuração principal da aplicação
│   ├── server.ts                 # Servidor principal
│   ├── worker.ts                 # Worker para processar jobs
│   ├── app/
│   │   ├── @types/               # Definições de tipos TypeScript
│   │   │   ├── fastify-jwt.d.ts
│   │   │   ├── fastify.d.ts
│   │   │   └── response.d.ts
│   │   ├── controllers/          # Controladores da API
│   │   │   ├── auth.controller.ts
│   │   │   └── mail.controller.ts
│   │   ├── helpers/              # Utilitários auxiliares
│   │   │   ├── data.helper.ts
│   │   │   └── job.logs.helper.ts
│   │   ├── jobs/                 # Processadores de jobs
│   │   │   └── mail.processor.ts
│   │   ├── libs/                 # Bibliotecas customizadas
│   │   │   ├── mail.ts
│   │   │   └── queue.ts
│   │   ├── routes/               # Definições de rotas
│   │   │   ├── auth.routes.ts
│   │   │   ├── index.ts
│   │   │   └── mail.routes.ts
│   │   ├── schemas/              # Validações com JSON Schema
│   │   │   ├── auth.schemas.ts
│   │   │   ├── mail.schemas.ts
│   │   │   └── register.schemas.ts
│   │   ├── services/             # Lógica de negócio
│   │   │   ├── auth.service.ts
│   │   │   └── mail.service.ts
│   │   └── utils/                # Utilitários gerais
│   │       └── http-error.ts
│   ├── config/                   # Configurações
│   │   ├── mail.ts
│   │   └── redis.ts
│   ├── data/                     # Persistência local
│   │   ├── clients.ts            # Dados dos clientes
│   │   └── data.json            # Arquivo de persistência local
│   └── env/                      # Validação de variáveis de ambiente
│       └── index.ts
├── .husky/                       # Git hooks
│   ├── commit-msg
│   └── pre-commit
├── docker-compose.yml            # Ambiente desenvolvimento
├── docker-compose.prod.yml       # Ambiente produção
├── Dockerfile                    # Imagem Docker
├── client.http                   # Arquivo para testes HTTP
├── commitlint.config.js         # Configuração de commits
├── eslint.config.mjs            # Configuração ESLint
├── tsconfig.json                # Configuração TypeScript
└── package.json                 # Dependências e scripts
```

## 🔧 Scripts Disponíveis

```bash
npm run dev            # Iniciar em modo desenvolvimento
npm run build          # Build do projeto
npm start              # Iniciar servidor em produção
npm run worker         # Iniciar apenas o worker de processamento
npm run worker:dev     # Iniciar apenas o worker de processamento em desenvolvimento
```

## 🐳 Docker

### Desenvolvimento
```bash
docker-compose up -d
```

### Produção
```bash
docker-compose -f docker-compose.prod.yml up --build
```

### Logs
```bash
docker-compose logs -f app
```

## 📈 Roadmap

**Próximas Features:**
- [ ] Integração com banco de dados (PostgreSQL/MySQL)
- [ ] Suporte a anexos de email
- [ ] Sistema de templates mais robusto
- [ ] Testes automatizados completos
- [ ] Métricas avançadas e alertas
- [ ] Interface web para administração
- [ ] Webhooks para notificações de status
- [ ] Sistema de backup automático dos dados

## 🤝 Contribuição

1. Faça fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças seguindo os padrões do projeto
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

### Padrões do Projeto

- Use **Conventional Commits** para mensagens de commit
- Siga os padrões do **ESLint** configurado
- Mantenha a cobertura de testes alta
- Documente novas funcionalidades

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**Richard Lirio**
- GitHub: [@RichardLirio](https://github.com/RichardLirio)
- LinkedIn: [Richard Silva Lirio](https://www.linkedin.com/in/richard-silva-lirio-b97484250/)

---

## 💡 Sobre Este Boilerplate

*Este projeto foi desenvolvido como um **boilerplate completo e funcional** para sistemas de envio de emails em background, demonstrando boas práticas de desenvolvimento com:*

- **Fastify** como framework web moderno e performático
- **TypeScript** para maior segurança e produtividade
- **Redis + Bull** para processamento de filas robusto
- **JWT** para autenticação segura
- **Docker** para containerização profissional
- **ESLint + Prettier** para qualidade de código
- **Husky** para hooks de git automatizados

*O objetivo é fornecer uma base sólida que pode ser facilmente adaptada e expandida para diferentes necessidades de projetos que requerem processamento assíncrono de emails.*

---

⭐ **Se este boilerplate foi útil para seu projeto, considere dar uma estrela no repositório!**