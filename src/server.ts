import { FastifyInstance } from "fastify";

import { env } from "./env";
import { buildApp } from "./app";
import { FileExist } from "./app/helpers/data.helper";

class Server {
  private app: FastifyInstance | null = null;

  async initialize() {
    this.app = await buildApp();
    this.setupGracefulShutdown();
  }

  private setupGracefulShutdown() {
    if (!this.app) return;

    const signals = ["SIGTERM", "SIGINT"]; // Sinais de termino e interrupção

    signals.forEach((signal) => {
      process.on(signal, async () => {
        this.app?.log.info(`Recebido sinal ${signal}, fechando servidor...`);

        try {
          await this.app?.close();
          this.app?.log.info("Servidor fechado com sucesso");
          process.exit(0);
        } catch (error) {
          this.app?.log.error("Erro ao fechar servidor:", error);
          process.exit(1);
        }
      });
    });
  }

  async start() {
    try {
      await FileExist();
      if (!this.app) {
        await this.initialize();
      }

      if (!this.app) {
        throw new Error("Falha ao inicializar a aplicação");
      }

      await this.app.listen({
        port: env.PORT,
        host: env.HOST,
      });
      console.log(`🆗 Servidor rodando em http://${env.HOST}:${env.PORT}`);
      console.log(`🧪 Health check: http://${env.HOST}:${env.PORT}/health`);
      console.log(`💡 Ambiente: ${env.NODE_ENV}`);
    } catch (error) {
      console.error("Erro ao iniciar servidor:", error);
      process.exit(1);
    }
  }
}

// Inicializar servidor apenas se este arquivo for executado diretamente
if (require.main === module) {
  const server = new Server();
  server.start().catch((error) => {
    console.error("Falha ao iniciar servidor:", error);
    process.exit(1);
  });
}

export { Server };
export default Server;
