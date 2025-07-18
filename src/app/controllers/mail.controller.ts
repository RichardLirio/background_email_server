import crypto from "crypto";
import { BatchEmailJobData, emailBatchQueue } from "../libs/queue";
import { EmailService } from "../services/mail.service";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  EmailList,
  emailListSchema,
  JobParamId,
  jobParamsId,
} from "../schemas/mail.schemas";
import { HttpError } from "../utils/http-error";
import { SuccessResponse } from "../@types/response";

export class EmailController {
  // Adiciona um lote de emails à fila com prioridade normal
  async addBatch(request: FastifyRequest, reply: FastifyReply) {
    const emails = emailListSchema.parse(request.body) as EmailList;

    try {
      // Validar entrada
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        throw new HttpError(
          "Lista de emails é obrigatória e deve conter pelo menos um item",
          400
        );
      }

      if (emails.length > 1000) {
        throw new HttpError("Máximo de 1000 emails por lote", 409);
      }

      // Gerar ID do lote
      const jobBatchId = `batch-${Date.now()}-${crypto
        .randomUUID()
        .substring(0, 8)}`;

      // Validar emails básicos
      const invalidEmails = emails.filter((email) => {
        const validation = EmailService.validateEmailData(email);
        return !validation.isValid;
      });

      if (invalidEmails.length > 0) {
        throw new HttpError(
          `${invalidEmails.length} emails com dados inválidos no lote`,
          400
        );
      }

      // Adicionar job à fila
      const job = await emailBatchQueue.add(
        "send-batch-emails",
        {
          batchId: jobBatchId,
          emails,
        } as BatchEmailJobData,
        {
          jobId: jobBatchId,
          priority: 0, // Prioridade normal
        }
      );

      console.log(
        `📤 Lote ${jobBatchId} adicionado à fila com ${emails.length} emails`
      );

      const response: SuccessResponse = {
        success: true,
        message: `📤 Lote ${jobBatchId} adicionado à fila com ${emails.length} emails`,
        data: {
          success: true,
          jobId: String(job.id),
          batchId: jobBatchId,
          totalEmails: emails.length,
          message: "Lote adicionado à fila de processamento",
        },
      };

      return reply.status(200).send(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      console.error("❌ Erro ao adicionar lote:", errorMessage);
      throw new HttpError(`Falha ao adicionar lote: ${errorMessage}`, 409);
    }
  }

  // Obtém status de um job
  async getJobStatus(request: FastifyRequest, reply: FastifyReply) {
    const { jobId } = jobParamsId.parse(request.params) as JobParamId;

    try {
      const job = await emailBatchQueue.getJob(jobId);

      if (!job) {
        throw new HttpError("Job não encontrado", 404);
      }

      const state = await job.getState();
      const progress = job.progress();

      const response: SuccessResponse = {
        success: true,
        message: `📤 Lote ${job.id} encontrado com sucesso.`,
        data: {
          status: state,
          progress: typeof progress === "number" ? progress : undefined,
          data: job.data,
          result: job.returnvalue,
          error: job.failedReason,
          createdAt: job.timestamp
            ? new Date(job.timestamp).toISOString()
            : undefined,
          processedAt: job.processedOn
            ? new Date(job.processedOn).toISOString()
            : undefined,
          finishedAt: job.finishedOn
            ? new Date(job.finishedOn).toISOString()
            : undefined,
          attempts: job.attemptsMade,
        },
      };

      return reply.code(200).send(response);
    } catch (error) {
      console.error("❌ Erro ao obter status do job:", error);
      throw new HttpError("Erro ao consultar status do job", 400);
    }
  }

  //Lista jobs ativos
  async getActiveJobs(_: FastifyRequest, reply: FastifyReply) {
    try {
      const activeJobs = await emailBatchQueue.getActive();

      const response: SuccessResponse = {
        success: true,
        message: `📤 Lista de Jobs ativos encontrada com sucesso.`,
        data: {
          activeJobs: activeJobs.map((job) => ({
            id: String(job.id),
            batchId: job.data.batchId,
            progress: job.progress(),
            totalEmails: job.data.emails.length,
            createdAt: new Date(job.timestamp).toISOString(),
          })),
        },
      };

      return reply.code(200).send(response);
    } catch (error) {
      console.error("❌ Erro ao obter jobs ativos:", error);
      throw new Error("Erro ao consultar jobs ativos");
    }
  }

  // /**
  //  * Cancela um job
  //  */
  // static async cancelJob(jobId: string): Promise<{
  //   success: boolean;
  //   message: string;
  // }> {
  //   try {
  //     const job = await emailBatchQueue.getJob(jobId);

  //     if (!job) {
  //       return {
  //         success: false,
  //         message: "Job não encontrado",
  //       };
  //     }

  //     const state = await job.getState();

  //     if (state === "completed") {
  //       return {
  //         success: false,
  //         message: "Job já foi completado",
  //       };
  //     }

  //     if (state === "active") {
  //       return {
  //         success: false,
  //         message: "Job está sendo processado e não pode ser cancelado",
  //       };
  //     }

  //     await job.remove();
  //     console.log(`🗑️ Job ${jobId} cancelado`);

  //     return {
  //       success: true,
  //       message: "Job cancelado com sucesso",
  //     };
  //   } catch (error) {
  //     console.error("❌ Erro ao cancelar job:", error);
  //     throw new Error("Erro ao cancelar job");
  //   }
  // }

  // /**
  //  * Obtém estatísticas gerais
  //  */
  // static async getStats(): Promise<{
  //   processor: unknown;
  //   recentJobs: Array<{
  //     id: string;
  //     batchId: string;
  //     status: string;
  //     totalEmails: number;
  //     result?: unknown;
  //     createdAt: string;
  //     finishedAt?: string;
  //   }>;
  // }> {
  //   try {
  //     const processorStats = await emailProcessor.getStats();

  //     // Obter jobs recentes (últimos 10 completos)
  //     const recentCompleted = await emailBatchQueue.getCompleted(0, 9);
  //     const recentFailed = await emailBatchQueue.getFailed(0, 9);

  //     const recentJobs = [...recentCompleted, ...recentFailed]
  //       .sort(
  //         (a, b) =>
  //           (b.finishedOn || b.timestamp) - (a.finishedOn || a.timestamp)
  //       )
  //       .slice(0, 10)
  //       .map((job) => ({
  //         id: String(job.id),
  //         batchId: job.data.batchId,
  //         status: job.finishedOn ? "completed" : "failed",
  //         totalEmails: job.data.emails.length,
  //         result: job.returnvalue,
  //         createdAt: new Date(job.timestamp).toISOString(),
  //         finishedAt: job.finishedOn
  //           ? new Date(job.finishedOn).toISOString()
  //           : undefined,
  //       }));

  //     return {
  //       processor: processorStats,
  //       recentJobs,
  //     };
  //   } catch (error) {
  //     console.error("❌ Erro ao obter estatísticas:", error);
  //     throw new Error("Erro ao consultar estatísticas");
  //   }
  // }

  // /**
  //  * Pausa a fila
  //  */
  // static async pauseQueue(): Promise<{ success: boolean; message: string }> {
  //   try {
  //     await emailBatchQueue.pause();
  //     console.log("⏸️ Fila pausada");
  //     return {
  //       success: true,
  //       message: "Fila pausada com sucesso",
  //     };
  //   } catch (error) {
  //     console.error("❌ Erro ao pausar fila:", error);
  //     throw new Error("Erro ao pausar fila");
  //   }
  // }

  // /**
  //  * Retoma a fila
  //  */
  // static async resumeQueue(): Promise<{ success: boolean; message: string }> {
  //   try {
  //     await emailBatchQueue.resume();
  //     console.log("▶️ Fila retomada");
  //     return {
  //       success: true,
  //       message: "Fila retomada com sucesso",
  //     };
  //   } catch (error) {
  //     console.error("❌ Erro ao retomar fila:", error);
  //     throw new Error("Erro ao retomar fila");
  //   }
  // }

  // /**
  //  * Força limpeza de jobs antigos
  //  */
  // static async cleanupJobs(): Promise<{ success: boolean; message: string }> {
  //   try {
  //     await emailProcessor.forceCleanup();
  //     return {
  //       success: true,
  //       message: "Limpeza executada com sucesso",
  //     };
  //   } catch (error) {
  //     console.error("❌ Erro na limpeza:", error);
  //     throw new Error("Erro ao executar limpeza");
  //   }
  // }
}
