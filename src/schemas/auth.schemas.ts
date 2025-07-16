import z from "zod";

export const authSchema = z.object({
  client_id: z.string().uuid().min(1, "client_id é obrigatório"),
  client_secret: z.string().min(1, "client_secret é obrigatório"),
});

export type AuthInput = z.infer<typeof authSchema>;
