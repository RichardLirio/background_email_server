import { SuccessResponse } from "@/app/@types/response";
import { addClient } from "@/data/clients";
import { AuthInput, authSchema } from "@/app/schemas/auth.schemas";
import { RegisterInput, registerSchema } from "@/app/schemas/register.schemas";
import { authenticate } from "@/app/services/auth.service";
import { FastifyReply, FastifyRequest } from "fastify";

export class AuthController {
  async auth(request: FastifyRequest, reply: FastifyReply) {
    const data = authSchema.parse(request.body) as AuthInput;

    try {
      const { token, scope } = await authenticate(
        data.client_id,
        data.client_secret
      );

      const response: SuccessResponse = {
        success: true,
        message: "Autorizado",
        data: {
          access_token: token,
          token_type: "Bearer",
          expires_in: 3600,
          scope,
        },
      };
      return reply.status(200).send(response);
    } catch (err) {
      return reply.code(401).send({
        error: err,
        message: "Credenciais inválidas",
      });
    }
  }

  async register(request: FastifyRequest, reply: FastifyReply) {
    const data = registerSchema.parse(request.body) as RegisterInput;

    try {
      const client_id = await addClient(data);

      const response: SuccessResponse = {
        success: true,
        message: "Cliente criado com sucesso.",
        data: {
          client_id: client_id,
        },
      };
      return reply.status(201).send(response);
    } catch (err) {
      return reply.code(401).send({
        error: err,
        message: "Erro ao cadastrar cliente",
      });
    }
  }
}
