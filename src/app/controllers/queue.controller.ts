import { SuccessResponse } from "@/app/@types/response";
import { FastifyReply, FastifyRequest } from "fastify";
import mail from "../libs/mail";

export class QueueController {
  async addOnQueue(_: FastifyRequest, reply: FastifyReply) {
    try {
      await mail.sendMail({
        from: `HM INFORMATICA <HM@HM.INF.BR>`,
        to: "Richard Lirio <richard@lirio.com.br>",
        subject: "Boleto",
        html: "Olá, segue boleto em anexo.",
      });

      const response: SuccessResponse = {
        success: true,
        message: "Email enviado",
      };

      return reply.status(200).send(response);
    } catch (err) {
      return reply.code(401).send({
        error: err,
        message: "Erro ao enviar email",
      });
    }
  }
}
