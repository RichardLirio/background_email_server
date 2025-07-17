import z from "zod";

export const mailSchema = z.array(
  z.object({
    from: z.object({
      name: z.string().min(1, "Nome é obrigatorio"),
      email: z.string().email().min(1, "Email é obrigatorio"),
    }),
    to: z.object({
      name: z.string().min(1, "Nome é obrigatorio"),
      email: z.string().email().min(1, "Email é obrigatorio"),
    }),
    cc: z.object({
      name: z.string().min(1, "Nome é obrigatorio"),
      email: z.string().email().min(1, "Email é obrigatorio"),
    }),
    subject: z.string().min(1, "Subject é obrigatorio"),
    html: z.string(),
  })
);

export type EmailData = z.infer<typeof mailSchema>;
