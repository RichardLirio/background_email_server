import z from "zod";

export const mailSchema = z.object({
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
});

export const jobParamsId = z.object({
  jobId: z.string(),
});

export const emailListSchema = z.array(mailSchema);

export type EmailData = z.infer<typeof mailSchema>;
export type EmailList = z.infer<typeof emailListSchema>;
export type JobParamId = z.infer<typeof jobParamsId>;
