import { Campaign, Prospect } from "@shared/schema";

export interface EmailSendResult {
  success: boolean;
  error?: string;
}

export class EmailSender {
  async sendEmail(
    to: string,
    subject: string,
    body: string
  ): Promise<EmailSendResult> {
    try {
      console.log(`[EMAIL] Sending to: ${to}`);
      console.log(`[EMAIL] Subject: ${subject}`);
      console.log(`[EMAIL] Body preview: ${body.substring(0, 100)}...`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendBulkEmails(
    campaign: Campaign,
    prospects: Prospect[],
    subject: string,
    generateBody: (prospect: Prospect) => Promise<string>
  ): Promise<{
    sent: number;
    failed: number;
  }> {
    let sent = 0;
    let failed = 0;

    for (const prospect of prospects) {
      if (!prospect.email) {
        failed++;
        continue;
      }

      try {
        const body = await generateBody(prospect);
        const result = await this.sendEmail(prospect.email, subject, body);

        if (result.success) {
          sent++;
        } else {
          failed++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(`Failed to send email to ${prospect.email}:`, error);
      }
    }

    return { sent, failed };
  }
}

export const emailSender = new EmailSender();
