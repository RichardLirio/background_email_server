import crypto from "crypto";
import mail from "../libs/mail";
import { redis } from "../libs/queue";
import { EmailData } from "../schemas/mail.schemas";

export class EmailService {
  private static readonly IDEMPOTENCY_PREFIX = "email:sent:";
  private static readonly CACHE_TTL = 3600; // 1 hora em segundos

  // Gera chave de idempotência baseada no conteúdo do email

  static generateIdempotencyKey(emailData: EmailData): string {
    const content = JSON.stringify({
      to: emailData.to.email.toLowerCase().trim(),
      subject: emailData.subject.trim(),
      html: emailData.html.trim(),
    });

    return crypto.createHash("sha256").update(content).digest("hex");
  }

  //Verifica se email já foi enviado recentemente

  static async isEmailAlreadySent(idempotencyKey: string): Promise<boolean> {
    try {
      const exists = await redis.exists(
        `${this.IDEMPOTENCY_PREFIX}${idempotencyKey}`
      );
      return exists === 1;
    } catch (error) {
      console.error("Erro ao verificar idempotência:", error);
      // Em caso de erro no Redis, permite o envio para não bloquear
      return false;
    }
  }

  // Marca email como enviado no cache

  static async markEmailAsSent(idempotencyKey: string): Promise<void> {
    try {
      await redis.setex(
        `${this.IDEMPOTENCY_PREFIX}${idempotencyKey}`,
        this.CACHE_TTL,
        JSON.stringify({
          sentAt: new Date().toISOString(),
          status: "sent",
        })
      );
    } catch (error) {
      console.error("Erro ao marcar email como enviado:", error);
      // Não é crítico se falhar, apenas loga o erro
    }
  }

  // Valida dados do email

  static validateEmailData(emailData: EmailData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validar campos obrigatórios
    if (!emailData.from?.email) errors.push("Email do remetente é obrigatório");
    if (!emailData.to?.email)
      errors.push("Email do destinatário é obrigatório");
    if (!emailData.subject) errors.push("Assunto é obrigatório");
    if (!emailData.html) errors.push("Conteúdo HTML é obrigatório");

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailData.from?.email && !emailRegex.test(emailData.from.email)) {
      errors.push("Email do remetente inválido");
    }
    if (emailData.to?.email && !emailRegex.test(emailData.to.email)) {
      errors.push("Email do destinatário inválido");
    }
    if (emailData.cc?.email && !emailRegex.test(emailData.cc.email)) {
      errors.push("Email do CC inválido");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Processa e envia um único email
  static async processEmail(emailData: EmailData): Promise<{
    success: boolean;
    idempotencyKey: string;
    skipped?: boolean;
    error?: string;
  }> {
    const idempotencyKey = this.generateIdempotencyKey(emailData);

    try {
      // Validar dados do email
      const validation = this.validateEmailData(emailData);
      if (!validation.isValid) {
        throw new Error(`Dados inválidos: ${validation.errors.join(", ")}`);
      }

      // Verificar se email já foi enviado
      if (await this.isEmailAlreadySent(idempotencyKey)) {
        console.log(
          `📧 Email para ${emailData.to.email} já enviado recentemente (pulando)`
        );
        return {
          success: true,
          idempotencyKey,
          skipped: true,
        };
      }

      // Preparar dados para envio
      const mailData = {
        from: `${emailData.from.name} <${emailData.from.email}>`,
        to: `${emailData.to.name} <${emailData.to.email}>`,
        subject: emailData.subject,
        html: emailData.html,
        ...(emailData.cc?.email && {
          cc: `${emailData.cc.name} <${emailData.cc.email}>`,
        }),
      };

      // Enviar email
      await mail.sendMail(mailData);

      // Marcar como enviado
      await this.markEmailAsSent(idempotencyKey);

      console.log(`✅ Email enviado para ${emailData.to.email}`);
      return {
        success: true,
        idempotencyKey,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      console.error(
        `❌ Erro ao enviar email para ${emailData.to.email}:`,
        errorMessage
      );

      return {
        success: false,
        idempotencyKey,
        error: errorMessage,
      };
    }
  }

  // Processa lote de emails
  static async processBatch(
    emails: EmailData[],
    onProgress?: (progress: number) => void
  ): Promise<{
    total: number;
    sent: number;
    skipped: number;
    failed: number;
    errors: Array<{ email: string; error: string }>;
  }> {
    const results = {
      total: emails.length,
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
    };

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      if (email)
        try {
          const result = await this.processEmail(email);

          if (result.success) {
            if (result.skipped) {
              results.skipped++;
            } else {
              results.sent++;
            }
          } else {
            results.failed++;
            results.errors.push({
              email: email.to.email,
              error: result.error || "Erro desconhecido",
            });
          }
        } catch (error) {
          results.failed++;
          const errorMessage =
            error instanceof Error ? error.message : "Erro desconhecido";
          results.errors.push({
            email: email.to.email,
            error: errorMessage,
          });
        }

      // Atualizar progresso
      const progress = Math.round(((i + 1) / emails.length) * 100);
      if (onProgress) {
        onProgress(progress);
      }

      // Pequeno delay para evitar sobrecarga
      if (i < emails.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  // Limpa cache de emails antigos
  static async cleanOldCache(): Promise<void> {
    try {
      const keys = await redis.keys(`${this.IDEMPOTENCY_PREFIX}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`🧹 Limpeza: ${keys.length} chaves removidas do cache`);
      }
    } catch (error) {
      console.error("Erro ao limpar cache:", error);
    }
  }

  // Obtém estatísticas do cache

  static async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
  }> {
    try {
      const keys = await redis.keys(`${this.IDEMPOTENCY_PREFIX}*`);
      const info = await redis.info("memory");
      const memoryMatch = info.match(/used_memory_human:(.+)/);

      return {
        totalKeys: keys.length,
        memoryUsage:
          memoryMatch && memoryMatch[1] ? memoryMatch[1].trim() : "N/A",
      };
    } catch (error) {
      console.error("Erro ao obter estatísticas do cache:", error);
      return {
        totalKeys: 0,
        memoryUsage: "N/A",
      };
    }
  }
}
