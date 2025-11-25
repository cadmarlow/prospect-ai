import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { firecrawlScraper } from "./services/firecrawl-scraper";
import { emailGenerator } from "./services/email-generator";
import { resendEmailSender } from "./services/resend-email-sender";
import { hunterService } from "./services/hunter-enrichment";
import { insertProspectSchema, insertEmailTemplateSchema, insertCampaignSchema, insertScrapingJobSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/stats", async (_req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/prospects", async (req, res) => {
    try {
      const { search, region, status } = req.query;
      const prospects = await storage.getProspects({
        search: search as string,
        region: region as string,
        status: status as string,
      });
      res.json(prospects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch prospects" });
    }
  });

  app.get("/api/prospects/export", async (_req, res) => {
    try {
      const prospects = await storage.getProspects();
      
      const escapeCSV = (value: string) => {
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };
      
      const csv = [
        "Entreprise,Email,Domaine,Téléphone,Ville,Région,Type d'activité,Source,Statut,Date",
        ...prospects.map(p =>
          [
            escapeCSV(p.companyName),
            escapeCSV(p.email || ""),
            escapeCSV(p.domain || ""),
            escapeCSV(p.phone || ""),
            escapeCSV(p.city || ""),
            escapeCSV(p.region || ""),
            escapeCSV(p.activityType || ""),
            escapeCSV(p.source),
            escapeCSV(p.status),
            escapeCSV(new Date(p.scrapedAt).toLocaleDateString("fr-FR")),
          ].join(",")
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=prospects.csv");
      res.send("\ufeff" + csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to export prospects" });
    }
  });

  app.post("/api/prospects", async (req, res) => {
    try {
      const data = insertProspectSchema.parse(req.body);
      const prospect = await storage.createProspect(data);
      res.json(prospect);
    } catch (error) {
      res.status(400).json({ error: "Invalid prospect data" });
    }
  });

  app.get("/api/templates", async (_req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const data = insertEmailTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(data);
      res.json(template);
    } catch (error) {
      res.status(400).json({ error: "Invalid template data" });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      await storage.deleteTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  app.get("/api/campaigns", async (_req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    try {
      const data = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(data);
      res.json(campaign);
    } catch (error) {
      res.status(400).json({ error: "Invalid campaign data" });
    }
  });

  app.post("/api/campaigns/:id/launch", async (req, res) => {
    try {
      const campaignId = req.params.id;
      const campaign = await storage.getCampaign(campaignId);
      
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      if (!campaign.templateId) {
        return res.status(400).json({ error: "Campaign has no template" });
      }

      const template = await storage.getTemplate(campaign.templateId);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const prospects = await storage.getProspects();
      const prospectsWithEmail = prospects.filter(p => p.email && p.email.includes('@'));
      
      if (prospectsWithEmail.length === 0) {
        return res.status(400).json({ error: "No prospects with valid email addresses" });
      }

      await storage.updateCampaign(campaignId, {
        status: "active",
        startedAt: new Date(),
        totalRecipients: prospectsWithEmail.length,
      });

      setImmediate(async () => {
        try {
          const result = await resendEmailSender.sendBulkEmails(
            campaign,
            prospectsWithEmail,
            template.subject,
            async (prospect) => {
              const { body } = await emailGenerator.generatePersonalizedEmail({
                companyName: prospect.companyName,
                domain: prospect.domain || undefined,
                region: prospect.region || undefined,
                activityType: prospect.activityType || undefined,
                templateSubject: template.subject,
                templateBody: template.body,
              });
              return body;
            }
          );

          await storage.updateCampaign(campaignId, {
            status: "completed",
            sentCount: result.sent,
            completedAt: new Date(),
          });
        } catch (error) {
          console.error("Campaign execution error:", error);
          await storage.updateCampaign(campaignId, {
            status: "failed",
            completedAt: new Date(),
          });
        }
      });

      res.json({ success: true, message: "Campaign launched", recipients: prospectsWithEmail.length });
    } catch (error) {
      console.error("Campaign launch error:", error);
      res.status(500).json({ error: "Failed to launch campaign" });
    }
  });

  app.get("/api/email/test-connection", async (_req, res) => {
    try {
      const result = await resendEmailSender.testConnection();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to test connection" });
    }
  });

  app.post("/api/email/send-test", async (req, res) => {
    try {
      const { to, subject, body } = req.body;
      
      if (!to || !subject || !body) {
        return res.status(400).json({ error: "Missing required fields: to, subject, body" });
      }

      const result = await resendEmailSender.sendEmail(to, subject, body);
      res.json(result);
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ success: false, error: "Failed to send test email" });
    }
  });

  app.get("/api/scraping/jobs", async (_req, res) => {
    try {
      const jobs = await storage.getScrapingJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scraping jobs" });
    }
  });

  const extendedScrapingSchema = insertScrapingJobSchema.extend({
    keywords: z.string().optional(),
    maxResults: z.number().min(1).max(100).optional(),
    customUrl: z.string().url().optional(),
  });

  app.post("/api/scraping/start", async (req, res) => {
    try {
      const data = extendedScrapingSchema.parse(req.body);
      const { keywords, maxResults, customUrl, ...jobData } = data;
      
      const job = await storage.createScrapingJob(jobData);

      setImmediate(async () => {
        await firecrawlScraper.scrape(
          job.source,
          job.region || "",
          job.activityType || "",
          job.id,
          { keywords, maxResults, customUrl }
        );
      });

      res.json(job);
    } catch (error) {
      console.error("Scraping start error:", error);
      res.status(400).json({ error: "Invalid scraping job data" });
    }
  });

  // Hunter.io Enrichment API Routes
  app.get("/api/enrichment/status", async (_req, res) => {
    try {
      const result = await hunterService.checkConnection();
      res.json(result);
    } catch (error: any) {
      res.json({ success: false, error: error.message });
    }
  });

  app.post("/api/enrichment/prospect/:id", async (req, res) => {
    try {
      const prospectId = req.params.id;
      const result = await hunterService.enrichProspect(prospectId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/enrichment/all", async (req, res) => {
    try {
      const { limit = 50 } = req.body;
      
      // Get count of prospects without email for immediate response
      const prospects = await storage.getProspects();
      const prospectsWithoutEmail = prospects.filter(p => !p.email || !p.email.includes('@'));
      const toEnrich = Math.min(prospectsWithoutEmail.length, limit);

      // Start enrichment in background
      setImmediate(async () => {
        try {
          await hunterService.enrichAllProspects({ 
            onlyWithoutEmail: true, 
            limit,
            delayMs: 1000 // Rate limit: 1 request per second
          });
        } catch (error) {
          console.error("Bulk enrichment error:", error);
        }
      });

      res.json({ 
        success: true, 
        message: `Enrichment started for ${toEnrich} prospects`,
        total: toEnrich
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/enrichment/verify-email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const result = await hunterService.verifyEmail(email);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/enrichment/search-domain", async (req, res) => {
    try {
      const { domain } = req.body;
      if (!domain) {
        return res.status(400).json({ error: "Domain is required" });
      }
      const result = await hunterService.searchDomain(domain);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Settings API Routes
  app.get("/api/settings/services", async (_req, res) => {
    try {
      const services = [];

      // Check Firecrawl
      const firecrawlKey = process.env.FIRECRAWL_API_KEY;
      services.push({
        id: "firecrawl",
        name: "Firecrawl",
        description: "Scraping web intelligent avec gestion automatique des CAPTCHAs",
        status: firecrawlKey ? "connected" : "not_configured",
        configured: !!firecrawlKey,
        secretName: "FIRECRAWL_API_KEY",
        docsUrl: "https://firecrawl.dev",
      });

      // Check Hunter.io
      const hunterKey = process.env.HUNTER_API_KEY;
      let hunterStatus = "not_configured";
      let hunterQuota = null;
      if (hunterKey) {
        try {
          const hunterCheck = await hunterService.checkConnection();
          hunterStatus = hunterCheck.success ? "connected" : "error";
          if (hunterCheck.account) {
            hunterQuota = {
              searches: hunterCheck.account.calls?.available,
              verifications: hunterCheck.account.requests?.verifications?.available,
            };
          }
        } catch {
          hunterStatus = "error";
        }
      }
      services.push({
        id: "hunter",
        name: "Hunter.io",
        description: "Recherche de domaines et emails professionnels",
        status: hunterStatus,
        configured: !!hunterKey,
        secretName: "HUNTER_API_KEY",
        docsUrl: "https://hunter.io",
        quota: hunterQuota,
      });

      // Check OpenAI
      const openaiKey = process.env.OPENAI_API_KEY;
      services.push({
        id: "openai",
        name: "OpenAI",
        description: "Extraction IA et génération d'emails personnalisés",
        status: openaiKey ? "connected" : "not_configured",
        configured: !!openaiKey,
        secretName: "OPENAI_API_KEY",
        docsUrl: "https://platform.openai.com",
        note: !openaiKey ? "Mode fallback regex actif pour le scraping" : undefined,
      });

      // Check Resend (via Replit connector)
      let resendStatus = "not_configured";
      let resendEmail = null;
      try {
        const resendCheck = await resendEmailSender.testConnection();
        resendStatus = resendCheck.success ? "connected" : "not_configured";
        resendEmail = resendCheck.fromEmail;
      } catch {
        resendStatus = "not_configured";
      }
      services.push({
        id: "resend",
        name: "Resend",
        description: "Service d'envoi d'emails transactionnels",
        status: resendStatus,
        configured: resendStatus === "connected",
        fromEmail: resendEmail,
        isReplitConnector: true,
        docsUrl: "https://resend.com",
        note: "Configuré via le connecteur Replit (pas besoin de SMTP)",
      });

      res.json({ services });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch services status" });
    }
  });

  // AI Template Generation
  app.post("/api/templates/generate", async (req, res) => {
    try {
      const { industry, tone, purpose, companyType } = req.body;

      if (!industry || !purpose) {
        return res.status(400).json({ error: "Industry and purpose are required" });
      }

      // Use OpenAI GPT-3.5-turbo (cheaper model)
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en rédaction d'emails de prospection B2B en français. Tu crées des templates d'emails professionnels et efficaces.

Règles:
- Utilise les variables {{companyName}}, {{domain}}, {{region}} dans le contenu
- Ajoute {{aiPersonalization}} quelque part pour la personnalisation automatique
- Le ton doit être professionnel mais pas trop formel
- L'email doit être concis (max 150 mots)
- Inclus un call-to-action clair
- Ne mets pas de signature (elle sera ajoutée automatiquement)

Retourne un JSON avec: { "name": "...", "subject": "...", "body": "...", "category": "..." }`
          },
          {
            role: "user",
            content: `Crée un template d'email de prospection pour:
- Secteur: ${industry}
- Objectif: ${purpose}
- Type d'entreprise cible: ${companyType || "PME"}
- Ton souhaité: ${tone || "professionnel"}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "No response from AI" });
      }

      const template = JSON.parse(content);
      res.json({ success: true, template });
    } catch (error: any) {
      console.error("AI template generation error:", error);
      
      // If OpenAI fails, return a default template
      if (error?.code === "insufficient_quota" || error?.status === 429 || error?.status === 401) {
        const defaultTemplate = {
          name: `Template ${req.body.industry || "Prospection"}`,
          subject: `Proposition de collaboration - {{companyName}}`,
          body: `Bonjour,

Je me permets de vous contacter car notre agence accompagne les entreprises comme {{companyName}} dans la région {{region}}.

{{aiPersonalization}}

Notre expertise pourrait vous aider à développer votre activité. Seriez-vous disponible pour un court échange téléphonique cette semaine ?

Dans l'attente de votre retour,`,
          category: req.body.industry || "prospection",
        };
        return res.json({ 
          success: true, 
          template: defaultTemplate, 
          note: "Template par défaut (OpenAI non disponible)" 
        });
      }
      
      res.status(500).json({ error: "Failed to generate template" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
