import {
  prospects,
  emailTemplates,
  campaigns,
  emailSends,
  scrapingJobs,
  type Prospect,
  type InsertProspect,
  type EmailTemplate,
  type InsertEmailTemplate,
  type Campaign,
  type InsertCampaign,
  type EmailSend,
  type ScrapingJob,
  type InsertScrapingJob,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, or, desc } from "drizzle-orm";

export interface IStorage {
  getProspects(filters?: {
    search?: string;
    region?: string;
    status?: string;
  }): Promise<Prospect[]>;
  getProspect(id: string): Promise<Prospect | undefined>;
  createProspect(prospect: InsertProspect): Promise<Prospect>;
  updateProspect(id: string, data: Partial<InsertProspect>): Promise<Prospect>;
  
  getTemplates(): Promise<EmailTemplate[]>;
  getTemplate(id: string): Promise<EmailTemplate | undefined>;
  createTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  deleteTemplate(id: string): Promise<void>;
  
  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign>;
  
  getScrapingJobs(): Promise<ScrapingJob[]>;
  createScrapingJob(job: InsertScrapingJob): Promise<ScrapingJob>;
  updateScrapingJob(id: string, data: Partial<ScrapingJob>): Promise<ScrapingJob>;
  
  getStats(): Promise<{
    totalProspects: number;
    totalEmailsSent: number;
    openRate: number;
    conversionRate: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getProspects(filters?: {
    search?: string;
    region?: string;
    status?: string;
  }): Promise<Prospect[]> {
    let query = db.select().from(prospects).$dynamic();
    
    const conditions = [];
    
    if (filters?.search) {
      conditions.push(
        or(
          like(prospects.companyName, `%${filters.search}%`),
          like(prospects.email, `%${filters.search}%`),
          like(prospects.domain, `%${filters.search}%`)
        )
      );
    }
    
    if (filters?.region && filters.region !== "all") {
      conditions.push(eq(prospects.region, filters.region));
    }
    
    if (filters?.status && filters.status !== "all") {
      conditions.push(eq(prospects.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(prospects.scrapedAt));
  }

  async getProspect(id: string): Promise<Prospect | undefined> {
    const [prospect] = await db.select().from(prospects).where(eq(prospects.id, id));
    return prospect || undefined;
  }

  async createProspect(insertProspect: InsertProspect): Promise<Prospect> {
    const [prospect] = await db
      .insert(prospects)
      .values(insertProspect)
      .returning();
    return prospect;
  }

  async updateProspect(id: string, data: Partial<InsertProspect>): Promise<Prospect> {
    const [prospect] = await db
      .update(prospects)
      .set(data)
      .where(eq(prospects.id, id))
      .returning();
    return prospect;
  }

  async getTemplates(): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));
  }

  async getTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template || undefined;
  }

  async createTemplate(insertTemplate: InsertEmailTemplate): Promise<EmailTemplate> {
    const [template] = await db
      .insert(emailTemplates)
      .values(insertTemplate)
      .returning();
    return template;
  }

  async deleteTemplate(id: string): Promise<void> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }

  async getCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db
      .insert(campaigns)
      .values(insertCampaign)
      .returning();
    return campaign;
  }

  async updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign> {
    const [campaign] = await db
      .update(campaigns)
      .set(data)
      .where(eq(campaigns.id, id))
      .returning();
    return campaign;
  }

  async getScrapingJobs(): Promise<ScrapingJob[]> {
    return await db.select().from(scrapingJobs).orderBy(desc(scrapingJobs.createdAt));
  }

  async createScrapingJob(insertJob: InsertScrapingJob): Promise<ScrapingJob> {
    const [job] = await db
      .insert(scrapingJobs)
      .values(insertJob)
      .returning();
    return job;
  }

  async updateScrapingJob(id: string, data: Partial<ScrapingJob>): Promise<ScrapingJob> {
    const [job] = await db
      .update(scrapingJobs)
      .set(data)
      .where(eq(scrapingJobs.id, id))
      .returning();
    return job;
  }

  async getStats(): Promise<{
    totalProspects: number;
    totalEmailsSent: number;
    openRate: number;
    conversionRate: number;
  }> {
    const [prospectCount] = await db.select().from(prospects);
    const allProspects = await db.select().from(prospects);
    
    const allEmailSends = await db.select().from(emailSends);
    
    const totalProspects = allProspects.length;
    const totalEmailsSent = allEmailSends.length;
    const openedEmails = allEmailSends.filter(e => e.openedAt !== null).length;
    const clickedEmails = allEmailSends.filter(e => e.clickedAt !== null).length;
    
    const openRate = totalEmailsSent > 0 ? Math.round((openedEmails / totalEmailsSent) * 100) : 0;
    const conversionRate = totalEmailsSent > 0 ? Math.round((clickedEmails / totalEmailsSent) * 100) : 0;
    
    return {
      totalProspects,
      totalEmailsSent,
      openRate,
      conversionRate,
    };
  }
}

export const storage = new DatabaseStorage();
