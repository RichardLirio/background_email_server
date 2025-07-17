#!/usr/bin/env node

/**
 * Worker principal para processamento de emails
 * Este arquivo deve ser executado como um processo separado
 */

import { emailProcessor } from "./app/jobs/mail.processor";

async function startWorker() {
  console.log("🚀 Iniciando Email Worker...");

  try {
    // Inicializar processador
    await emailProcessor.initialize();

    console.log("✅ Email Worker iniciado com sucesso");
    console.log("📡 Aguardando jobs de email...");

    // Manter processo vivo
    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);
  } catch (error) {
    console.error("💥 Erro ao iniciar worker:", error);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  console.log("\n🛑 Recebido sinal de shutdown...");

  try {
    await emailProcessor.stop();
    console.log("✅ Worker parado com sucesso");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro durante shutdown:", error);
    process.exit(1);
  }
}

// Iniciar worker se executado diretamente
if (require.main === module) {
  startWorker();
}

export { startWorker };
