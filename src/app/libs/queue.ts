import Bull from "bull";
import Redis from "ioredis";
import redisConfig from "@/config/redis";
import { EmailData } from "../schemas/mail.schemas";

// Instância do Redis para operações de cache
export const redis = new Redis(redisConfig);

// Interface para o job de lote
export interface BatchEmailJobData {
  batchId: string;
  emails: EmailData[];
}

// Interface para resultado do processamento
export interface BatchJobResult {
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

// Configuração da fila Bull
export const emailBatchQueue = new Bull("email-batch-queue", {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "fixed",
      delay: 5000, // 5 segundos
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// Função para determinar se um job deve ser considerado como falha
function shouldJobFail(result: BatchJobResult): boolean {
  // Se todos os emails falharam, considere como falha total
  if (result.failed === result.total && result.total > 0) {
    return true;
  }

  // Se mais de 50% dos emails falharam, considere como falha
  if (result.failed > result.total * 0.5) {
    return true;
  }

  return false;
}

// Event listeners para monitoramento
emailBatchQueue.on("completed", (job, result: BatchJobResult) => {
  if (result.failed > 0) {
    console.log(`⚠️ Job ${job.id} completed with ${result.failed} failures:`, {
      batchId: result.batchId,
      stats: {
        total: result.total,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
      },
      errors: result.errors,
    });
  } else {
    console.log(`✅ Job ${job.id} completed successfully:`, {
      batchId: result.batchId,
      stats: {
        total: result.total,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
      },
      duration: result.duration,
      errors: result.errors,
    });
  }
});

emailBatchQueue.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed completely:`, {
    batchId: job.data?.batchId,
    error: err.message,
    stack: err.stack,
  });
});

emailBatchQueue.on("stalled", (job) => {
  console.warn(`⚠️ Job ${job.id} stalled:`, {
    batchId: job.data?.batchId,
    attempts: job.attemptsMade,
    maxAttempts: job.opts.attempts,
  });
});

emailBatchQueue.on("progress", (job, progress) => {
  console.log(`📊 Job ${job.id} progress: ${progress}%`, {
    batchId: job.data?.batchId,
  });
});

export function processJobResult(result: BatchJobResult): BatchJobResult {
  // Se deve falhar baseado nos critérios, lance uma exceção
  if (shouldJobFail(result)) {
    const details = {
      batchId: result.batchId,
      errors: result.errors,
      stats: {
        total: result.total,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
      },
    };

    const error = new Error(
      `Batch processing failed: ${result.failed}/${
        result.total
      } emails failed${JSON.stringify(details)}`
    );

    throw error;
  }

  return result;
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🔄 Shutting down email batch queue...");
  await emailBatchQueue.close();
  await redis.quit();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🔄 Shutting down email batch queue...");
  await emailBatchQueue.close();
  await redis.quit();
  process.exit(0);
});
