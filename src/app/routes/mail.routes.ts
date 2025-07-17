import { FastifyInstance } from "fastify";
import { EmailController } from "../controllers/mail.controller";

export async function mailRoutes(app: FastifyInstance) {
  const emailController = new EmailController();
  /**
   * Adiciona um lote de emails à fila
   */
  app.post(
    "/batch",
    { preHandler: app.auth([app.authenticate!]) },
    emailController.addBatch
  );

  /**
   * POST /api/emails/batch/priority
   * Adiciona um lote prioritário de emails à fila
   */
  //   router.post("/batch/priority", async (req: Request, res: Response) => {
  //     try {
  //       const { emails, batchId } = req.body as {
  //         emails: EmailData[];
  //         batchId?: string;
  //       };

  //       const result = await EmailController.addPriorityBatch(emails, batchId);
  //       res.status(201).json(result);
  //     } catch (error) {
  //       const errorMessage =
  //         error instanceof Error ? error.message : "Erro interno do servidor";
  //       res.status(400).json({
  //         success: false,
  //         error: errorMessage,
  //       });
  //     }
  //   });

  //   /**
  //    * GET /api/emails/job/:jobId
  //    * Obtém status de um job específico
  //    */
  //   router.get("/job/:jobId", async (req: Request, res: Response) => {
  //     try {
  //       const { jobId } = req.params;
  //       const status = await EmailController.getJobStatus(jobId);

  //       if (status.status === "not_found") {
  //         return res.status(404).json({
  //           success: false,
  //           error: "Job não encontrado",
  //         });
  //       }

  //       res.json({
  //         success: true,
  //         data: status,
  //       });
  //     } catch (error) {
  //       const errorMessage =
  //         error instanceof Error ? error.message : "Erro interno do servidor";
  //       res.status(500).json({
  //         success: false,
  //         error: errorMessage,
  //       });
  //     }
  //   });

  //   /**
  //    * GET /api/emails/jobs/active
  //    * Lista jobs ativos
  //    */
  //   router.get("/jobs/active", async (req: Request, res: Response) => {
  //     try {
  //       const activeJobs = await EmailController.getActiveJobs();
  //       res.json({
  //         success: true,
  //         data: activeJobs,
  //       });
  //     } catch (error) {
  //       const errorMessage =
  //         error instanceof Error ? error.message : "Erro interno do servidor";
  //       res.status(500).json({
  //         success: false,
  //         error: errorMessage,
  //       });
  //     }
  //   });

  //   /**
  //    * DELETE /api/emails/job/:jobId
  //    * Cancela um job
  //    */
  //   router.delete("/job/:jobId", async (req: Request, res: Response) => {
  //     try {
  //       const { jobId } = req.params;
  //       const result = await EmailController.cancelJob(jobId);

  //       if (!result.success) {
  //         return res.status(400).json(result);
  //       }

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

  //   /**
  //    * GET /api/emails/stats
  //    * Obtém estatísticas gerais
  //    */
  //   router.get("/stats", async (req: Request, res: Response) => {
  //     try {
  //       const stats = await EmailController.getStats();
  //       res.json({
  //         success: true,
  //         data: stats,
  //       });
  //     } catch (error) {
  //       const errorMessage =
  //         error instanceof Error ? error.message : "Erro interno do servidor";
  //       res.status(500).json({
  //         success: false,
  //         error: errorMessage,
  //       });
  //     }
  //   });

  //   /**
  //    * POST /api/emails/queue/pause
  //    * Pausa a fila
  //    */
  //   router.post("/queue/pause", async (req: Request, res: Response) => {
  //     try {
  //       const result = await EmailController.pauseQueue();
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

  //   /**
  //    * POST /api/emails/queue/resume
  //    * Retoma a fila
  //    */
  //   router.post("/queue/resume", async (req: Request, res: Response) => {
  //     try {
  //       const result = await EmailController.resumeQueue();
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
