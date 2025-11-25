import { Resend } from 'resend';
import { Campaign, Prospect, EmailSend } from "@shared/schema";
import { storage } from "../storage";
import { db } from "../db";
import { emailSends } from "@shared/schema";

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected. Please configure Resend in integrations.');
  }
  
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkSendResult {
  sent: number;
  failed: number;
  results: SendResult[];
}

const DELAY_BETWEEN_EMAILS_MS = 1000;
const MAX_EMAILS_PER_MINUTE = 50;

export class ResendEmailSender {
  private emailQueue: Array<{
    to: string;
    subject: string;
    body: string;
    prospectId: string;
    campaignId: string;
  }> = [];
  
  private isProcessing = false;

  async sendEmail(
    to: string,
    subject: string,
    body: string,
    options?: { prospectId?: string; campaignId?: string }
  ): Promise<SendResult> {
    try {
      const { client, fromEmail } = await getResendClient();

      if (!to || !to.includes('@')) {
        return { success: false, error: 'Invalid email address' };
      }

      const htmlBody = this.convertToHtml(body);

      const result = await client.emails.send({
        from: fromEmail || 'ProspectAI <noreply@resend.dev>',
        to: [to],
        subject: subject,
        html: htmlBody,
        text: body,
      });

      if (result.error) {
        console.error('[Resend] Send error:', result.error);
        return { success: false, error: result.error.message };
      }

      console.log(`[Resend] Email sent to ${to}, ID: ${result.data?.id}`);

      if (options?.prospectId && options?.campaignId) {
        await db.insert(emailSends).values({
          campaignId: options.campaignId,
          prospectId: options.prospectId,
          subject,
          body,
          status: 'sent',
          sentAt: new Date(),
        });
      }

      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('[Resend] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (options?.prospectId && options?.campaignId) {
        await db.insert(emailSends).values({
          campaignId: options.campaignId,
          prospectId: options.prospectId,
          subject,
          body,
          status: 'failed',
          error: errorMessage,
        });
      }
      
      return { success: false, error: errorMessage };
    }
  }

  async sendBulkEmails(
    campaign: Campaign,
    prospects: Prospect[],
    subject: string,
    getPersonalizedBody: (prospect: Prospect) => Promise<string>
  ): Promise<BulkSendResult> {
    const results: SendResult[] = [];
    let sent = 0;
    let failed = 0;

    const validProspects = prospects.filter(p => p.email && p.email.includes('@'));

    console.log(`[Resend] Starting bulk send: ${validProspects.length} recipients`);

    for (let i = 0; i < validProspects.length; i++) {
      const prospect = validProspects[i];
      
      try {
        const personalizedBody = await getPersonalizedBody(prospect);
        
        const personalizedSubject = this.replaceVariables(subject, prospect);

        const result = await this.sendEmail(
          prospect.email!,
          personalizedSubject,
          personalizedBody,
          { prospectId: prospect.id, campaignId: campaign.id }
        );

        results.push(result);

        if (result.success) {
          sent++;
          await storage.updateProspect(prospect.id, {
            status: 'contacted',
            lastContactedAt: new Date(),
          });
        } else {
          failed++;
        }

        if (i < validProspects.length - 1) {
          await this.delay(DELAY_BETWEEN_EMAILS_MS);
        }

        if ((i + 1) % 10 === 0) {
          console.log(`[Resend] Progress: ${i + 1}/${validProspects.length} emails processed`);
        }
      } catch (error) {
        console.error(`[Resend] Error sending to ${prospect.email}:`, error);
        failed++;
        results.push({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    console.log(`[Resend] Bulk send completed: ${sent} sent, ${failed} failed`);

    return { sent, failed, results };
  }

  private replaceVariables(text: string, prospect: Prospect): string {
    return text
      .replace(/\{\{companyName\}\}/g, prospect.companyName || '')
      .replace(/\{\{domain\}\}/g, prospect.domain || '')
      .replace(/\{\{city\}\}/g, prospect.city || '')
      .replace(/\{\{region\}\}/g, prospect.region || '')
      .replace(/\{\{activityType\}\}/g, prospect.activityType || '');
  }

  private convertToHtml(text: string): string {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    const withBreaks = escaped.replace(/\n/g, '<br>');
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  ${withBreaks}
</body>
</html>`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testConnection(): Promise<{ success: boolean; fromEmail?: string; error?: string }> {
    try {
      const { fromEmail } = await getCredentials();
      return { success: true, fromEmail };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to connect to Resend' 
      };
    }
  }
}

export const resendEmailSender = new ResendEmailSender();
