import type { Job } from "bull";
import { BatchEmailJobData, emailBatchQueue } from "../libs/queue";
import { EmailService } from "../services/mail.service";
import { JobLogger } from "../helpers/job.logs.helper";

/**
 * Type alias para compatibilidade com Bull
 */
export type BullJob<T = unknown> = Job<T>;

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
 * Configurações para determinar quando um job deve falhar
 */
interface FailureConfig {
  // Falha se todos os emails falharam (padrão: true)
  failOnAllFailed: boolean;
  // Falha se a taxa de falha exceder este percentual (padrão: 0.8 = 80%)
  failureThreshold: number;
  // Falha se nenhum email foi enviado com sucesso (padrão: true)
  failOnZeroSent: boolean;
}

/**
 * Processador principal dos jobs de email
 */
class EmailProcessor {
  private static instance: EmailProcessor;
  private isProcessing = false;
  private failureConfig: FailureConfig = {
    failOnAllFailed: true,
    failureThreshold: 0.8, // 80% ao falhar marca o job como falho
    failOnZeroSent: true,
  };

  private constructor() {}

  static getInstance(): EmailProcessor {
    if (!EmailProcessor.instance) {
      EmailProcessor.instance = new EmailProcessor();
    }
    return EmailProcessor.instance;
  }

  /**
   * Configura os critérios de falha
   */
  setFailureConfig(config: Partial<FailureConfig>): void {
    this.failureConfig = { ...this.failureConfig, ...config };
    console.log("⚙️ Configuração de falha atualizada:", this.failureConfig);
  }

  /**
   * Determina se um job deve ser marcado como falha baseado nos resultados
   */
  private shouldJobFail(results: BatchProcessingResults): boolean {
    const { total, sent, failed } = results;

    // Se não há emails para processar, não é falha
    if (total === 0) {
      return false;
    }

    // Falha se todos os emails falharam
    if (this.failureConfig.failOnAllFailed && failed === total) {
      return true;
    }

    // Falha se nenhum email foi enviado com sucesso
    if (this.failureConfig.failOnZeroSent && sent === 0 && total > 0) {
      return true;
    }

    // Falha se a taxa de falha exceder o threshold
    const failureRate = failed / total;
    if (failureRate > this.failureConfig.failureThreshold) {
      return true;
    }

    return false;
  }

  /**
   * Cria uma exceção detalhada para jobs que devem falhar
   */
  private createJobFailureError(results: BatchProcessingResults): Error {
    const { batchId, total, sent, failed, errors } = results;
    const failureRate = ((failed / total) * 100).toFixed(1);

    const details = {
      batchId,
      stats: { total, sent, failed, skipped: results.skipped },
      failureRate: parseFloat(failureRate),
      errors: errors.slice(0, 10), // Limita a 10 erros para não sobrecarregar logs
      totalErrors: errors.length,
      duration: results.duration,
      timestamp: results.endTime,
      config: this.failureConfig,
    };

    const error = new Error(
      `Batch ${batchId} failed: ${failed}/${total} emails failed (${failureRate}%)\n ${JSON.stringify(
        details
      )}`
    );

    return error;
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
    console.log("⚙️ Configuração de falha:", this.failureConfig);
  }

  /**
   * Processa um job de lote de emails
   */
  private async processBatchJob(
    job: BullJob<BatchEmailJobData>
  ): Promise<BatchProcessingResults> {
    const { batchId, emails } = job.data;
    const startTime = Date.now();
    const logger = new JobLogger(job);

    console.log(`📦 Processando lote ${batchId} com ${emails.length} emails`);
    await logger.info(
      `📦 Processando lote ${batchId} com ${emails.length} emails`
    );

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

      // Verificar se o job deve ser marcado como falha
      if (this.shouldJobFail(finalResults)) {
        // Log antes de falhar
        console.error(`❌ Lote ${batchId} será marcado como falha:`, {
          total: finalResults.total,
          sent: finalResults.sent,
          failed: finalResults.failed,
          failureRate: `${(
            (finalResults.failed / finalResults.total) *
            100
          ).toFixed(1)}%`,
          duration: finalResults.duration,
        });

        await logger.error(`❌ Lote ${batchId} será marcado como falha:`, {
          total: finalResults.total,
          sent: finalResults.sent,
          failed: finalResults.failed,
          failureRate: `${(
            (finalResults.failed / finalResults.total) *
            100
          ).toFixed(1)}%`,
          duration: finalResults.duration,
        });

        // Log erros detalhados
        if (finalResults.errors.length > 0) {
          console.error(
            `🔍 Primeiros erros do lote ${batchId}:`,
            finalResults.errors.slice(0, 5)
          );
          await logger.error(`🔍 Primeiros erros do lote ${batchId}:`, {
            errors: finalResults.errors.slice(0, 5),
          });
        }

        // Lança exceção para marcar como falha no Bull
        throw this.createJobFailureError(finalResults);
      }

      // Log de sucesso (completo ou parcial)
      if (finalResults.failed > 0) {
        console.warn(`⚠️ Lote ${batchId} completado com falhas parciais:`, {
          total: finalResults.total,
          sent: finalResults.sent,
          failed: finalResults.failed,
          duration: finalResults.duration,
          errors: finalResults.errors,
        });

        await logger.warn(
          `⚠️ Lote ${batchId} completado com falhas parciais:`,
          {
            total: finalResults.total,
            sent: finalResults.sent,
            failed: finalResults.failed,
            duration: finalResults.duration,
          }
        );
      } else {
        console.log(
          `✅ Lote ${batchId} processado com sucesso em ${duration.toFixed(
            2
          )}s:`,
          {
            total: finalResults.total,
            sent: finalResults.sent,
            duration: finalResults.duration,
          }
        );

        await logger.success(
          `✅ Lote ${batchId} processado com sucesso em ${duration.toFixed(
            2
          )}s:`,
          {
            total: finalResults.total,
            sent: finalResults.sent,
            duration: finalResults.duration,
          }
        );
      }

      return finalResults;
    } catch (error) {
      // Para outros erros críticos durante processamento
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      console.error(`💥 Erro crítico no lote ${batchId}:`, {
        error: errorMessage,
        duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
        stack: error instanceof Error ? error.stack : undefined,
      });

      await logger.error(`💥 Erro crítico no lote ${batchId}:`, {
        error: errorMessage,
        duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Cria erro estruturado para erros críticos
      const criticalError = new Error(
        `Falha crítica no processamento do lote ${batchId}: ${errorMessage}`
      );

      throw criticalError;
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
   * Obtém configuração atual de falhas
   */
  getFailureConfig(): FailureConfig {
    return { ...this.failureConfig };
  }

  /**
   * Força limpeza imediata
   */
  async forceCleanup(): Promise<void> {
    await this.cleanupOldJobs();
  }

  /**
   * Obtém detalhes de jobs falhados recentes para análise
   */
  async getRecentFailures(limit: number = 10): Promise<
    Array<{
      id: string;
      batchId: string;
      failedAt: string;
      error: string;
    }>
  > {
    try {
      const failedJobs = await emailBatchQueue.getFailed(0, limit - 1);

      return failedJobs.map((job) => ({
        id: job.id?.toString() || "unknown",
        batchId: job.data?.batchId || "unknown",
        failedAt: job.processedOn
          ? new Date(job.processedOn).toISOString()
          : "unknown",
        error: job.failedReason || "Erro desconhecido",
      }));
    } catch (error) {
      console.error("❌ Erro ao obter falhas recentes:", error);
      return [];
    }
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
