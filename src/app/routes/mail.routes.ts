import { FastifyInstance } from "fastify";
import { EmailController } from "../controllers/mail.controller";

export async function mailRoutes(app: FastifyInstance) {
  const emailController = new EmailController();
  // POST /emails/batch
  // Adiciona um lote de emails à fila
  app.post(
    "/batch",
    { preHandler: app.auth([app.authenticate!]) },
    emailController.addBatch
  );

  // GET /emails/job/:jobId
  // Captura estatus do job pelo id
  app.get(
    "/job/:jobId",
    { preHandler: app.auth([app.authenticate!]) },
    emailController.getJobStatus
  );

  // GET /emails/jobs/active
  // Lista jobs ativos

  app.get(
    "/jobs/active",
    { preHandler: app.auth([app.authenticate!]) },
    emailController.getActiveJobs
  );

  // DELETE /emails/job/:jobId
  // Cancela um job

  app.delete(
    "/job/:jobId",
    { preHandler: app.auth([app.authenticate!]) },
    emailController.cancelJob
  );

  // GET /emails/stats
  // Obtém estatísticas gerais
  app.get("/stats", emailController.getStats);

  // POST /emails/queue/pause
  //  Pausa a fila
  app.post(
    "/queue/pause",
    { preHandler: app.auth([app.authenticate!]) },
    emailController.pauseQueue
  );

  // POST /emails/queue/resume
  // Retoma a fila
  app.post(
    "/queue/resume",
    { preHandler: app.auth([app.authenticate!]) },
    emailController.resumeQueue
  );

  // POST /emails/cleanup
  // Força limpeza de jobs antigos
  app.post(
    "/cleanup",
    { preHandler: app.auth([app.authenticate!]) },
    emailController.cleanupJobs
  );
}
