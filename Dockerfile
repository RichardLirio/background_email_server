# Stage base
FROM node:22.17.0-alpine AS base

# Instala dependências do sistema necessárias
RUN apk add --no-cache dumb-init

# Instala o pnpm globalmente
RUN npm install -g pnpm && npm cache clean --force

# Cria um usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs
RUN adduser -S emailsapp -u 1001

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./
COPY pnpm-lock.yaml ./

# Stage para desenvolvimento
FROM base AS development
ENV NODE_ENV=development

# Instala todas as dependências (incluindo devDependencies)
RUN pnpm install
COPY . .

# Ajusta permissões
RUN chown -R emailsapp:nodejs /app
USER emailsapp
EXPOSE 3333
CMD ["dumb-init", "pnpm", "run", "dev"]

# Stage para build - aqui instalamos TODAS as dependências
FROM base AS builder
ENV NODE_ENV=development

# Instala todas as dependências com base no pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY . .

# Build da aplicação TypeScript
RUN pnpm run build

# Stage para dependências de produção
FROM base AS production-deps
ENV NODE_ENV=production

# Copia arquivos de dependências
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Instala apenas dependências de produção
RUN pnpm install --frozen-lockfile --prod --ignore-scripts && npm cache clean --force

# Stage final para produção
FROM base AS production
ENV NODE_ENV=production

# Copia dependências de produção do stage anterior
COPY --from=production-deps --chown=emailsapp:nodejs /app/node_modules ./node_modules

# Copia a pasta public do projeto
COPY --from=builder --chown=emailsapp:nodejs /app/public ./public

# Copia código compilado do builder
COPY --from=builder --chown=emailsapp:nodejs /app/dist ./dist

# Copia package.json para ter as informações necessárias
COPY --from=builder --chown=emailsapp:nodejs /app/package*.json ./

# Muda para usuário não-root
USER emailsapp

# Expõe a porta da aplicação
EXPOSE 3333

CMD ["dumb-init", "pnpm", "run", "start"]