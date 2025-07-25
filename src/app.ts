import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { env } from "./env";
import { ZodError } from "zod";
import { ErrorResponse, SuccessResponse } from "./app/@types/response";
import { HttpError } from "./app/utils/http-error";
import jwt from "jsonwebtoken";
import { authRoutes } from "./app/routes/auth.routes";
import { getClients } from "./data/clients";
import { mailRoutes } from "./app/routes/mail.routes";
import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { emailBatchQueue } from "./app/libs/queue";
import { FastifyAdapter } from "@bull-board/fastify";
import { homeRoutes } from "./app/routes";

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "error" : "info",
      transport:
        env.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "HH:MM:ss",
              },
            }
          : undefined,
    },
  });

  // Configurar tratamento de erros
  setupErrorHandling(app);

  // Registrar plugins
  await registerPlugins(app);

  // Registrar rotas
  await registerRoutes(app);

  // bull board
  await registerBullBoard(app);

  return app;
}

async function registerPlugins(app: FastifyInstance) {
  await app.register(import("@fastify/auth"));

  // CORS
  await app.register(import("@fastify/cors"), {
    origin: env.CORS_ORIGINS || ["http://localhost:3333"],
  });

  // Rate limiting
  await app.register(import("@fastify/rate-limit"), {
    max: env.RATE_LIMIT_MAX || 100,
    timeWindow: "1 minute", // limite dee 100 requisições por minuto do mesmo endereço
  });

  // Helmet para segurança básica
  await app.register(import("@fastify/helmet"));

  // JWT (se configurado)
  if (env.JWT_SECRET) {
    await app.register(import("@fastify/jwt"), {
      secret: env.JWT_SECRET,
      sign: {
        expiresIn: env.JWT_EXPIRES_IN,
      },
    });
  }

  // Hook de autenticação personalizado
  app.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        const authorization = request.headers.authorization;
        if (!authorization) {
          throw new Error("Token não fornecido");
        }

        const token = authorization.replace("Bearer ", "");
        const decoded = jwt.verify(token, env.JWT_SECRET) as {
          client_id: string;
        };
        const clients = await getClients();
        const client = clients.find((client) => {
          return decoded.client_id === client.id;
        });
        if (!client || !client.active) {
          throw new Error("Cliente inválido ou inativo");
        }

        request.user = {
          client_id: client.id,
          name: client.name,
          scopes: client.scopes,
        };
      } catch (error) {
        app.log.warn("Erro na autenticação", error);
        const response: ErrorResponse = {
          success: false,
          message: "Não autenticado",
          error: `Bearer token requerido.`,
          statusCode: 401,
        };

        return reply.status(401).send(response);
      }
    }
  );
}

async function registerBullBoard(app: FastifyInstance) {
  const serverAdapter = new FastifyAdapter();
  createBullBoard({
    queues: [
      new BullAdapter(emailBatchQueue, {
        readOnlyMode: false,
        allowRetries: true,
        description: "Fila de processamento de emails em lote",
      }),
    ],
    serverAdapter: serverAdapter,
    options: {
      uiConfig: {
        boardTitle: "Email Processor Dashboard",
      },
    },
  });

  await app.register(serverAdapter.registerPlugin(), {
    prefix: "/admin/queues",
  });

  app.log.info("Bull Board configurado com sucesso");
}

async function registerRoutes(app: FastifyInstance) {
  // Health check
  app.get("/health", async (_, reply) => {
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(), // tempo de atividade do processo
      memory: process.memoryUsage(), // uso de memoria do processo
      version: process.version, // versao do nodejs
      environment: env.NODE_ENV || "development",
    };

    const response: SuccessResponse = {
      success: true,
      message: "Servidor funcionando normalmente",
      data: healthData,
    };

    return reply.status(200).send(response);
  });
  const prefix = "/api/v1";
  // Rotas da API
  await app.register(homeRoutes);
  await app.register(authRoutes, { prefix: `${prefix}/auth` });
  await app.register(mailRoutes, { prefix: `${prefix}/emails` });
}

function setupErrorHandling(app: FastifyInstance) {
  // Handler de erros
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // Verificar se a resposta já foi enviada
    if (reply.sent) {
      return;
    }
    if (error instanceof HttpError) {
      const response: ErrorResponse = {
        success: false,
        message: "Ops! Algo errado aconteceu",
        statusCode: error.statusCode,
        error: error.message,
      };
      return reply.status(error.statusCode).send(response);
    }

    // Tratar erros do Zod
    if (error instanceof ZodError) {
      const validationErrors = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      const response: ErrorResponse = {
        success: false,
        message: "Dados de solicitação inválidos",
        error: validationErrors,
        statusCode: 400,
      };

      return reply.status(400).send(response);
    }

    // Tratar outros erros HTTP conhecidos
    const statusCode = error.statusCode || 500;
    const message =
      statusCode >= 500 ? "Erro interno do servidor" : error.message;

    return reply.status(statusCode).send({
      error: true,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    });
  });

  // Handler para rotas não encontradas
  app.setNotFoundHandler((request, reply) => {
    const response: ErrorResponse = {
      success: false,
      message: "Rota não encontrada",
      error: `Rote ${request.method} ${request.originalUrl} not found`,
      statusCode: 404,
    };

    return reply.status(404).send(response);
  });
}
