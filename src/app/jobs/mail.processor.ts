// Importar tipos do Bull se disponível, caso contrário usar nossa interface
import type { Job } from "bull";
import { BatchEmailJobData, emailBatchQueue } from "../libs/queue";
import { EmailService } from "../services/mail.service";

/**
 * Type alias para compatibilidade com Bull
 */
type BullJob<T = unknown> = Job<T>;

/**
 * Interface para os resultados do processamento de lote
 */
interface BatchProcessingResults {
  batchId: string;
  total: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: Array<{
    email: string;
    error: string;
  }>;
  duration: string;
  startTime: string;
  endTime: string;
}

/**
 * Interface para estatísticas da fila
 */
interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

/**
 * Interface para estatísticas do cache
 */
interface CacheStats {
  totalKeys: number;
  memoryUsage: string;
}

/**
 * Interface para estatísticas completas do processador
 */
interface ProcessorStats {
  isProcessing: boolean;
  queue: QueueStats;
  cache: CacheStats;
}

/**
 * Processador principal dos jobs de email
 */
class EmailProcessor {
  private static instance: EmailProcessor;
  private isProcessing = false;

  private constructor() {}

  static getInstance(): EmailProcessor {
    if (!EmailProcessor.instance) {
      EmailProcessor.instance = new EmailProcessor();
    }
    return EmailProcessor.instance;
  }

  /**
   * Inicializa o processador
   */
  async initialize(): Promise<void> {
    if (this.isProcessing) {
      console.warn("⚠️ Processador já está em execução");
      return;
    }

    this.isProcessing = true;
    console.log("🚀 Iniciando processador de emails...");

    // Registrar processador do job
    emailBatchQueue.process(
      "send-batch-emails",
      this.processBatchJob.bind(this)
    );

    // Configurar limpeza automática (a cada 4 horas)
    setInterval(async () => {
      await this.cleanupOldJobs();
    }, 4 * 60 * 60 * 1000);

    console.log("✅ Processador de emails iniciado com sucesso");
  }

  /**
   * Processa um job de lote de emails
   */
  private async processBatchJob(
    job: BullJob<BatchEmailJobData>
  ): Promise<BatchProcessingResults> {
    const { batchId, emails } = job.data;
    const startTime = Date.now();

    console.log(`📦 Processando lote ${batchId} com ${emails.length} emails`);

    try {
      // Atualizar progresso inicial
      await job.progress(0);

      // Processar emails usando o serviço
      const results = await EmailService.processBatch(
        emails,
        async (progress: number) => {
          await job.progress(progress);
        }
      );

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      const finalResults: BatchProcessingResults = {
        batchId,
        ...results,
        duration: `${duration.toFixed(2)}s`,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      };

      // Log final
      console.log(`✅ Lote ${batchId} processado em ${duration.toFixed(2)}s:`, {
        total: results.total,
        sent: results.sent,
        skipped: results.skipped,
        failed: results.failed,
        errorCount: results.errors.length,
      });

      // Log erros se houver
      if (results.errors.length > 0) {
        console.error(`❌ Erros no lote ${batchId}:`, results.errors);
      }

      return finalResults;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      console.error(`💥 Erro crítico no lote ${batchId}:`, errorMessage);

      // Re-throw para que o Bull possa tentar novamente
      throw new Error(
        `Falha no processamento do lote ${batchId}: ${errorMessage}`
      );
    }
  }

  /**
   * Limpa jobs antigos
   */
  private async cleanupOldJobs(): Promise<void> {
    try {
      console.log("🧹 Iniciando limpeza de jobs antigos...");

      // Remove jobs completos com mais de 24h
      const completedCleaned = await emailBatchQueue.clean(
        24 * 60 * 60 * 1000,
        "completed"
      );

      // Remove jobs falhados com mais de 48h
      const failedCleaned = await emailBatchQueue.clean(
        48 * 60 * 60 * 1000,
        "failed"
      );

      // Limpa cache antigo
      await EmailService.cleanOldCache();

      console.log(
        `🧹 Limpeza concluída: ${completedCleaned.length} completos, ${failedCleaned.length} falhados`
      );
    } catch (error) {
      console.error("❌ Erro na limpeza automática:", error);
    }
  }

  /**
   * Para o processador graciosamente
   */
  async stop(): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    console.log("🛑 Parando processador de emails...");

    try {
      // Pausa a fila para não aceitar novos jobs
      await emailBatchQueue.pause();

      // Aguarda jobs ativos terminarem (timeout de 30s)
      const activeJobs = await emailBatchQueue.getActive();
      if (activeJobs.length > 0) {
        console.log(
          `⏳ Aguardando ${activeJobs.length} jobs ativos terminarem...`
        );

        const timeout = 30000; // 30 segundos
        const startTime = Date.now();

        while (true) {
          const currentActiveJobs = await emailBatchQueue.getActive();
          if (currentActiveJobs.length === 0) {
            break;
          }

          if (Date.now() - startTime > timeout) {
            console.warn(
              "⚠️ Timeout aguardando jobs ativos. Forçando parada..."
            );
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      this.isProcessing = false;
      console.log("✅ Processador parado com sucesso");
    } catch (error) {
      console.error("❌ Erro ao parar processador:", error);
    }
  }

  /**
   * Obtém estatísticas do processador
   */
  async getStats(): Promise<ProcessorStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      emailBatchQueue.getWaiting(),
      emailBatchQueue.getActive(),
      emailBatchQueue.getCompleted(),
      emailBatchQueue.getFailed(),
      emailBatchQueue.getDelayed(),
    ]);

    const cacheStats = await EmailService.getCacheStats();

    return {
      isProcessing: this.isProcessing,
      queue: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      },
      cache: cacheStats,
    };
  }

  /**
   * Força limpeza imediata
   */
  async forceCleanup(): Promise<void> {
    await this.cleanupOldJobs();
  }
}

// Exportar instância singleton
export const emailProcessor = EmailProcessor.getInstance();

// Auto-inicialização se este arquivo for executado diretamente
if (require.main === module) {
  (async () => {
    try {
      await emailProcessor.initialize();
      console.log("📡 Processador de emails em execução...");
    } catch (error) {
      console.error("💥 Erro ao iniciar processador:", error);
      process.exit(1);
    }
  })();
}
