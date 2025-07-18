import { FastifyInstance } from "fastify";
import { EmailController } from "../controllers/mail.controller";

export async function mailRoutes(app: FastifyInstance) {
  const emailController = new EmailController();
  // POST emails/batch
  // Adiciona um lote de emails à fila
  app.post(
    "/batch",
    { preHandler: app.auth([app.authenticate!]) },
    emailController.addBatch
  );

  // GET emails/job/:jobId
  // Captura estatus do job pelo id
  app.get(
    "/job/:jobId",
    { preHandler: app.auth([app.authenticate!]) },
    emailController.getJobStatus
  );

  // GET /api/emails/jobs/active
  // Lista jobs ativos

  app.get(
    "/jobs/active",
    { preHandler: app.auth([app.authenticate!]) },
    emailController.getActiveJobs
  );

  // DELETE /api/emails/job/:jobId
  // Cancela um job

  app.delete(
    "/job/:jobId",
    { preHandler: app.auth([app.authenticate!]) },
    emailController.cancelJob
  );

  // GET /api/emails/stats
  // Obtém estatísticas gerais
  app.get("/stats", emailController.getStats);

  // POST /api/emails/queue/pause
  //  Pausa a fila
  app.post(
    "/queue/pause",
    { preHandler: app.auth([app.authenticate!]) },
    emailController.pauseQueue
  );

  // POST /api/emails/queue/resume
  // Retoma a fila
  app.post(
    "/queue/resume",
    { preHandler: app.auth([app.authenticate!]) },
    emailController.resumeQueue
  );

  //   /**
  //    * POST /api/emails/cleanup
  //    * Força limpeza de jobs antigos
  //    */
  //   router.post("/cleanup", async (req: Request, res: Response) => {
  //     try {
  //       const result = await EmailController.cleanupJobs();
  //       res.json(result);
  //     } catch (error) {
  //       const errorMessage =
  //         error instanceof Error ? error.message : "Erro interno do servidor";
  //       res.status(500).json({
  //         success: false,
  //         error: errorMessage,
  //       });
  //     }
  //   });
}
