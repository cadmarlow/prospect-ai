import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const prospects = pgTable("prospects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  domain: text("domain"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  region: text("region"),
  activityType: text("activity_type"),
  source: text("source").notNull(),
  scrapedAt: timestamp("scraped_at").notNull().defaultNow(),
  lastContactedAt: timestamp("last_contacted_at"),
  status: text("status").notNull().default("new"),
  notes: text("notes"),
});

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  category: text("category"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  templateId: varchar("template_id").references(() => emailTemplates.id),
  status: text("status").notNull().default("draft"),
  recipientFilters: jsonb("recipient_filters"),
  totalRecipients: integer("total_recipients").default(0),
  sentCount: integer("sent_count").default(0),
  openedCount: integer("opened_count").default(0),
  clickedCount: integer("clicked_count").default(0),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailSends = pgTable("email_sends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  prospectId: varchar("prospect_id").notNull().references(() => prospects.id),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const scrapingJobs = pgTable("scraping_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull(),
  region: text("region"),
  activityType: text("activity_type"),
  status: text("status").notNull().default("pending"),
  totalFound: integer("total_found").default(0),
  successCount: integer("success_count").default(0),
  errorCount: integer("error_count").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  error: text("error"),
});

export const prospectsRelations = relations(prospects, ({ many }) => ({
  emailSends: many(emailSends),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ many }) => ({
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  template: one(emailTemplates, {
    fields: [campaigns.templateId],
    references: [emailTemplates.id],
  }),
  emailSends: many(emailSends),
}));

export const emailSendsRelations = relations(emailSends, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [emailSends.campaignId],
    references: [campaigns.id],
  }),
  prospect: one(prospects, {
    fields: [emailSends.prospectId],
    references: [prospects.id],
  }),
}));

export const insertProspectSchema = createInsertSchema(prospects).omit({
  id: true,
  scrapedAt: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  totalRecipients: true,
  sentCount: true,
  openedCount: true,
  clickedCount: true,
});

export const insertScrapingJobSchema = createInsertSchema(scrapingJobs).omit({
  id: true,
  createdAt: true,
  totalFound: true,
  successCount: true,
  errorCount: true,
});

export type Prospect = typeof prospects.$inferSelect;
export type InsertProspect = z.infer<typeof insertProspectSchema>;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type EmailSend = typeof emailSends.$inferSelect;

export type ScrapingJob = typeof scrapingJobs.$inferSelect;
export type InsertScrapingJob = z.infer<typeof insertScrapingJobSchema>;
