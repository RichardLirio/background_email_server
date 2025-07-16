import "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    auth: (
      validators: Array<
        (request: FastifyRequest, reply: FastifyReply) => Promise<void>
      >
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user?: {
      client_id: string;
      name: string;
      scopes: string[];
    };
  }
}
