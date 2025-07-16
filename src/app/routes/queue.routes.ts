import { FastifyInstance } from "fastify";
import { QueueController } from "../controllers/queue.controller";

export async function queueRoutes(app: FastifyInstance) {
  const queueController = new QueueController();

  app.post(
    "/mail",
    { preHandler: app.auth([app.authenticate!]) },
    queueController.addOnQueue
  );
}
