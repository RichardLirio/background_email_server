import { FastifyInstance } from "fastify";

export async function homeRoutes(app: FastifyInstance) {
  // Rota de boas-vindas da API
  app.get("/", (_, reply) => {
    reply.code(200).send({
      success: true,
      message: "🎉 Welcome to Background server to send email batch!",
      version: "1.0.0",
      endpoints: {
        prefix: "/api/v1",
        publics: [
          {
            health: { method: "get", url: "/health" },
            board: {
              method: "get",
              url: "/admin/queues",
            },
            auth: {
              prefix: "/auth",
              register: {
                method: "post",
                url: "/register",
                body: {
                  name: "Example Enterprise Admin LTDA",
                  secret: "Admin@1234",
                  scopes: ["read", "write", "admin"],
                },
              },
              token: {
                method: "post",
                url: "/token",
                body: {
                  client_id: "{{client_id}}",
                  client_secret: "Admin@1234",
                },
              },
            },
            emails: {
              prefix: "/emails",
              stats: { method: "get", url: "/stats" },
            },
          },
        ],
        protected: [
          {
            emails: {
              prefix: "/emails",
              add_batch: {
                method: "post",
                url: "/batch",
                body: [
                  {
                    from: {
                      name: "Sistema de Cobrança",
                      email: "example@example.com.br",
                    },
                    to: {
                      name: "Cliente 1",
                      email: "cliente1@hotmail.com",
                    },
                    cc: {
                      name: "Financeiro",
                      email: "financeiro@example.com.br",
                    },
                    subject: "Fatura #4",
                  },
                  {
                    from: {
                      name: "Sistema de Cobrança",
                      email: "example@example.com.br",
                    },
                    to: {
                      name: "Cliente 2",
                      email: "cliente2@hotmail.com",
                    },
                    cc: {
                      name: "Financeiro",
                      email: "financeiro@example.com.br",
                    },
                    subject: "Fatura #5",
                  },
                ],
              },
              get_activate_batches: {
                method: "get",
                url: "/jobs/active",
              },
              get_batch_status_byId: {
                method: "delete",
                url: "/job/:jobId",
              },
              cleanup_old_batchs: {
                method: "post",
                url: "/cleanup",
              },
              delete_job: {
                method: "delete",
                url: "/job/:jobId",
              },
              pause_queue: {
                method: "post",
                url: "/queue/pause",
              },
              resume_queue: {
                method: "post",
                url: "/queue/resume",
              },
            },
          },
        ],
      },
    });
  });
}
