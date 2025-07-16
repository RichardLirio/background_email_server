// fastify-jwt.d.ts
import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    client: {
      client_id: string;
      iat: number;
      exp: number;
    }; // client type is return type of `request.client` object
  }
}
