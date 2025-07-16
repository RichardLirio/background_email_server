import { AuthController } from "@/controllers/auth.controller";
import { FastifyInstance } from "fastify";

export async function authRoutes(app: FastifyInstance) {
  const authController = new AuthController();

  app.post("/token", authController.auth);

  app.post("/register", authController.register);
}
