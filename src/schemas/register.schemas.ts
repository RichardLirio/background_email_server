import z from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  secret: z.string().min(6, "Secret deve ter pelo menos 6 caracteres"),
  scopes: z.array(z.enum(["read", "write", "admin"])),
});

export type RegisterInput = z.infer<typeof registerSchema>;
