import { FastifyInstance } from "fastify";
import { AuthController } from "../controllers/auth.controller";

export async function authRoutes(app: FastifyInstance) {
  const authController = new AuthController();

  app.post("/token", authController.auth);

  app.post("/register", authController.register);
}
