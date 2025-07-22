import { BullJob } from "../jobs/mail.processor";

export class JobLogger {
  constructor(private job: BullJob) {}

  async info(message: string, data?: unknown) {
    const logEntry = data
      ? `ℹ️ ${message}: ${JSON.stringify(data, null, 2)}`
      : `ℹ️ ${message}`;

    console.log(logEntry);
    await this.job.log(logEntry);
  }

  async warn(message: string, data?: unknown) {
    const logEntry = data
      ? `⚠️ ${message}: ${JSON.stringify(data, null, 2)}`
      : `⚠️ ${message}`;

    console.warn(logEntry);
    await this.job.log(logEntry);
  }

  async error(message: string, data?: unknown) {
    const logEntry = data
      ? `❌ ${message}: ${JSON.stringify(data, null, 2)}`
      : `❌ ${message}`;

    console.error(logEntry);
    await this.job.log(logEntry);
  }

  async success(message: string, data?: unknown) {
    const logEntry = data
      ? `✅ ${message}: ${JSON.stringify(data, null, 2)}`
      : `✅ ${message}`;

    console.log(logEntry);
    await this.job.log(logEntry);
  }
}
