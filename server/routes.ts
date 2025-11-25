import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { webScraper } from "./services/scraper";
import { emailGenerator } from "./services/email-generator";
import { emailSender } from "./services/email-sender";
import { insertProspectSchema, insertEmailTemplateSchema, insertCampaignSchema, insertScrapingJobSchema } from "@shared/schema";

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
      
      await storage.updateCampaign(campaignId, {
        status: "active",
        startedAt: new Date(),
        totalRecipients: prospects.length,
      });

      setImmediate(async () => {
        const result = await emailSender.sendBulkEmails(
          campaign,
          prospects,
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
      });

      res.json({ success: true, message: "Campaign launched" });
    } catch (error) {
      res.status(500).json({ error: "Failed to launch campaign" });
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

  app.post("/api/scraping/start", async (req, res) => {
    try {
      const data = insertScrapingJobSchema.parse(req.body);
      const job = await storage.createScrapingJob(data);

      setImmediate(async () => {
        await webScraper.scrape(
          job.source,
          job.region || "",
          job.activityType || "",
          job.id
        );
      });

      res.json(job);
    } catch (error) {
      res.status(400).json({ error: "Invalid scraping job data" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
