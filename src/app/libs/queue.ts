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

// Event listeners para monitoramento
emailBatchQueue.on("completed", (job, result) => {
  console.log(`✅ Job ${job.id} completed:`, result);
});

emailBatchQueue.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

emailBatchQueue.on("stalled", (job) => {
  console.warn(`⚠️ Job ${job.id} stalled`);
});

emailBatchQueue.on("progress", (job, progress) => {
  console.log(`📊 Job ${job.id} progress: ${progress}%`);
});

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
