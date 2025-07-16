import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      client_id: string;
      name: string;
      scopes: string[];
    };
  }
}
