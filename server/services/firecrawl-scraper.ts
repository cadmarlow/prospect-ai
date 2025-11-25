import FirecrawlApp from "@mendable/firecrawl-js";
import { InsertProspect } from "@shared/schema";
import { storage } from "../storage";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ScrapingConfig {
  source: string;
  region: string;
  activityType: string;
  keywords?: string;
  maxResults?: number;
  city?: string;
}

export interface ExtractedProspect {
  companyName: string;
  domain?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  activityType?: string;
  website?: string;
}

const REGION_TO_CITY: Record<string, string[]> = {
  "ile-de-france": ["Paris", "Boulogne-Billancourt", "Saint-Denis", "Versailles", "Nanterre"],
  "auvergne-rhone-alpes": ["Lyon", "Grenoble", "Saint-Étienne", "Clermont-Ferrand"],
  "provence-alpes-cote-azur": ["Marseille", "Nice", "Toulon", "Aix-en-Provence"],
  "occitanie": ["Toulouse", "Montpellier", "Nîmes", "Perpignan"],
  "nouvelle-aquitaine": ["Bordeaux", "Limoges", "Poitiers", "La Rochelle"],
  "bretagne": ["Rennes", "Brest", "Lorient", "Vannes"],
  "normandie": ["Rouen", "Caen", "Le Havre", "Cherbourg"],
  "hauts-de-france": ["Lille", "Amiens", "Dunkerque", "Roubaix"],
  "grand-est": ["Strasbourg", "Reims", "Metz", "Nancy"],
  "pays-de-la-loire": ["Nantes", "Angers", "Le Mans", "Saint-Nazaire"],
};

const ACTIVITY_KEYWORDS: Record<string, string[]> = {
  "immobilier-entreprise": ["immobilier entreprise", "bureaux", "locaux professionnels"],
  "promotion-immobiliere": ["promoteur immobilier", "promotion immobiliere"],
  "gestion-patrimoine": ["gestion patrimoine", "conseil patrimonial"],
  "agence-immobiliere": ["agence immobiliere", "agent immobilier"],
  "investissement": ["investissement immobilier", "SCPI"],
};

const PAGESJAUNES_BASE_URL = "https://www.pagesjaunes.fr";
const CCI_BASE_URL = "https://annuaire.entreprises.cci.fr";

export class FirecrawlScraper {
  private firecrawl: FirecrawlApp | null = null;

  private initFirecrawl() {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY is not configured. Please add your Firecrawl API key in Secrets.");
    }
    if (!this.firecrawl) {
      this.firecrawl = new FirecrawlApp({ apiKey });
    }
    return this.firecrawl;
  }

  private buildPagesJaunesUrl(config: ScrapingConfig): string {
    const cities = REGION_TO_CITY[config.region] || ["Paris"];
    const city = config.city || cities[0];
    const keywords = config.keywords || ACTIVITY_KEYWORDS[config.activityType]?.[0] || "immobilier entreprise";
    
    // Format correct pour Pages Jaunes: /annuaire/chercherlespros?quoiqui=KEYWORDS&ou=CITY
    const cleanKeywords = keywords.replace(/[^\w\s]/g, ' ').trim();
    const cleanCity = city.replace(/[^\w\s-]/g, '').trim();
    
    return `${PAGESJAUNES_BASE_URL}/annuaire/chercherlespros?quoiqui=${encodeURIComponent(cleanKeywords)}&ou=${encodeURIComponent(cleanCity)}`;
  }

  private buildCCIUrl(config: ScrapingConfig): string {
    const cities = REGION_TO_CITY[config.region] || ["Paris"];
    const city = config.city || cities[0];
    const keywords = config.keywords || ACTIVITY_KEYWORDS[config.activityType]?.[0] || "immobilier";
    
    // Annuaire entreprises CCI: recherche par activité et localisation
    return `${CCI_BASE_URL}/recherche?activite=${encodeURIComponent(keywords)}&localisation=${encodeURIComponent(city)}`;
  }

  private buildGoogleSearchUrl(config: ScrapingConfig): string {
    const cities = REGION_TO_CITY[config.region] || ["Paris"];
    const city = config.city || cities[0];
    const keywords = config.keywords || ACTIVITY_KEYWORDS[config.activityType]?.[0] || "immobilier entreprise";
    
    const searchQuery = `${keywords} ${city} site:linkedin.com OR site:societe.com OR site:pagesjaunes.fr`;
    return `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
  }

  async extractProspectsWithAI(pageContent: string, config: ScrapingConfig): Promise<ExtractedProspect[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en extraction de données d'entreprises. Tu analyses du contenu HTML/texte de pages web et extrais les informations des entreprises trouvées.

Retourne UNIQUEMENT un tableau JSON valide avec les entreprises trouvées. Chaque entreprise doit avoir ces champs (laisse vide si non trouvé):
- companyName: nom de l'entreprise (OBLIGATOIRE)
- email: email de contact
- phone: numéro de téléphone
- address: adresse complète
- city: ville
- website: site web
- domain: domaine du site web (extrait du site web ou de l'email)

Règles:
- Extrais TOUTES les entreprises que tu trouves
- Si tu ne trouves pas d'email, essaie de le déduire du domaine (contact@domaine.fr)
- Nettoie les données (supprime les espaces inutiles, formate les téléphones)
- Retourne [] si aucune entreprise n'est trouvée`
          },
          {
            role: "user",
            content: `Analyse ce contenu et extrais les entreprises liées à "${config.activityType}" dans la région "${config.region}":

${pageContent.substring(0, 15000)}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return [];

      const parsed = JSON.parse(content);
      const prospects = parsed.companies || parsed.prospects || parsed.entreprises || parsed.results || [];
      
      if (!Array.isArray(prospects)) return [];

      return prospects.filter((p: any) => p.companyName && p.companyName.trim() !== "");
    } catch (error) {
      console.error("AI extraction error:", error);
      return [];
    }
  }

  async scrapePagesJaunes(config: ScrapingConfig): Promise<ExtractedProspect[]> {
    const firecrawl = this.initFirecrawl();
    const url = this.buildPagesJaunesUrl(config);
    const allProspects: ExtractedProspect[] = [];
    const maxResults = config.maxResults || 20;

    console.log(`[Firecrawl] Scraping Pages Jaunes URL: ${url}`);

    try {
      // Use scrapeUrl first (simpler and more reliable for single pages)
      console.log(`[Firecrawl] Attempting single page scrape...`);
      const scrapeResponse = await firecrawl.scrapeUrl(url, {
        formats: ["markdown"],
      });
      
      console.log(`[Firecrawl] Scrape response success: ${scrapeResponse.success}`);
      
      if (scrapeResponse.success && scrapeResponse.markdown) {
        console.log(`[Firecrawl] Got ${scrapeResponse.markdown.length} chars of content`);
        const prospects = await this.extractProspectsWithAI(scrapeResponse.markdown, config);
        console.log(`[Firecrawl] AI extracted ${prospects.length} prospects`);
        allProspects.push(...prospects);
      } else {
        console.log(`[Firecrawl] No markdown content received, trying crawl...`);
        
        // Fallback to crawl for multi-page results
        const crawlResponse = await firecrawl.crawlUrl(url, {
          limit: Math.min(3, Math.ceil(maxResults / 10)),
          scrapeOptions: {
            formats: ["markdown"],
          },
        });

        if (crawlResponse.success && crawlResponse.data) {
          console.log(`[Firecrawl] Crawl got ${crawlResponse.data.length} pages`);
          for (const page of crawlResponse.data) {
            if (page.markdown) {
              const prospects = await this.extractProspectsWithAI(page.markdown, config);
              allProspects.push(...prospects);
              if (allProspects.length >= maxResults) break;
            }
          }
        }
      }
    } catch (error: any) {
      console.error("[Firecrawl] Pages Jaunes scraping error:", error?.message || error);
    }

    console.log(`[Firecrawl] Total prospects found: ${allProspects.length}`);
    
    return allProspects.slice(0, maxResults).map(p => ({
      ...p,
      region: config.region,
      activityType: config.activityType,
    }));
  }

  async scrapeCCI(config: ScrapingConfig): Promise<ExtractedProspect[]> {
    const firecrawl = this.initFirecrawl();
    const url = this.buildCCIUrl(config);
    const maxResults = config.maxResults || 20;

    console.log(`[Firecrawl] Scraping CCI URL: ${url}`);

    try {
      console.log(`[Firecrawl] Attempting CCI scrape...`);
      const scrapeResponse = await firecrawl.scrapeUrl(url, {
        formats: ["markdown"],
      });

      console.log(`[Firecrawl] CCI scrape response success: ${scrapeResponse.success}`);
      
      if (scrapeResponse.success && scrapeResponse.markdown) {
        console.log(`[Firecrawl] CCI got ${scrapeResponse.markdown.length} chars of content`);
        const prospects = await this.extractProspectsWithAI(scrapeResponse.markdown, config);
        console.log(`[Firecrawl] CCI AI extracted ${prospects.length} prospects`);
        return prospects.slice(0, maxResults).map(p => ({
          ...p,
          region: config.region,
          activityType: config.activityType,
        }));
      } else {
        console.log(`[Firecrawl] CCI no markdown content received`);
      }
    } catch (error: any) {
      console.error("[Firecrawl] CCI scraping error:", error?.message || error);
    }

    return [];
  }

  async scrapeLinkedIn(config: ScrapingConfig): Promise<ExtractedProspect[]> {
    const firecrawl = this.initFirecrawl();
    const cities = REGION_TO_CITY[config.region] || ["Paris"];
    const city = config.city || cities[0];
    const keywords = config.keywords || ACTIVITY_KEYWORDS[config.activityType]?.[0] || "immobilier entreprise";
    
    const searchUrl = `https://www.google.com/search?q=site:linkedin.com/company+${encodeURIComponent(keywords)}+${encodeURIComponent(city)}`;
    const maxResults = config.maxResults || 10;

    console.log(`[Firecrawl] Scraping LinkedIn via Google: ${searchUrl}`);

    try {
      const scrapeResponse = await firecrawl.scrapeUrl(searchUrl, {
        formats: ["markdown"],
      });

      if (scrapeResponse.success && scrapeResponse.markdown) {
        const prospects = await this.extractProspectsWithAI(scrapeResponse.markdown, config);
        return prospects.slice(0, maxResults).map(p => ({
          ...p,
          region: config.region,
          activityType: config.activityType,
        }));
      }
    } catch (error) {
      console.error("[Firecrawl] LinkedIn scraping error:", error);
    }

    return [];
  }

  async scrapeCustomUrl(url: string, config: ScrapingConfig): Promise<ExtractedProspect[]> {
    const firecrawl = this.initFirecrawl();
    const maxResults = config.maxResults || 50;

    console.log(`[Firecrawl] Scraping custom URL: ${url}`);

    try {
      const crawlResponse = await firecrawl.crawlUrl(url, {
        limit: 10,
        scrapeOptions: {
          formats: ["markdown"],
        },
      });

      if (crawlResponse.success && crawlResponse.data) {
        const allProspects: ExtractedProspect[] = [];
        
        for (const page of crawlResponse.data) {
          if (page.markdown) {
            const prospects = await this.extractProspectsWithAI(page.markdown, config);
            allProspects.push(...prospects);
            
            if (allProspects.length >= maxResults) break;
          }
        }

        return allProspects.slice(0, maxResults).map(p => ({
          ...p,
          region: config.region,
          activityType: config.activityType,
        }));
      }
    } catch (error) {
      console.error("[Firecrawl] Custom URL scraping error:", error);
    }

    return [];
  }

  async scrape(
    source: string,
    region: string,
    activityType: string,
    jobId: string,
    options?: { keywords?: string; maxResults?: number; customUrl?: string }
  ): Promise<void> {
    try {
      await storage.updateScrapingJob(jobId, {
        status: "running",
        startedAt: new Date(),
      });

      const config: ScrapingConfig = {
        source,
        region,
        activityType,
        keywords: options?.keywords,
        maxResults: options?.maxResults || 20,
      };

      let results: ExtractedProspect[] = [];

      if (options?.customUrl) {
        results = await this.scrapeCustomUrl(options.customUrl, config);
      } else if (source === "pagesjaunes") {
        results = await this.scrapePagesJaunes(config);
      } else if (source === "cci") {
        results = await this.scrapeCCI(config);
      } else if (source === "linkedin") {
        results = await this.scrapeLinkedIn(config);
      }

      console.log(`[Firecrawl] Found ${results.length} prospects`);

      let successCount = 0;
      let errorCount = 0;

      for (const result of results) {
        try {
          const existingProspect = result.email 
            ? await storage.getProspectByEmail(result.email)
            : null;

          if (existingProspect) {
            console.log(`[Firecrawl] Skipping duplicate: ${result.companyName}`);
            continue;
          }

          const prospectData: InsertProspect = {
            companyName: result.companyName,
            domain: result.domain || this.extractDomain(result.website || result.email),
            email: result.email,
            phone: result.phone,
            address: result.address,
            city: result.city,
            region: result.region || region,
            activityType: result.activityType || activityType,
            source,
            status: "new",
          };

          await storage.createProspect(prospectData);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error("Error saving prospect:", error);
        }
      }

      await storage.updateScrapingJob(jobId, {
        status: "completed",
        totalFound: results.length,
        successCount,
        errorCount,
        completedAt: new Date(),
      });

      console.log(`[Firecrawl] Job completed: ${successCount} saved, ${errorCount} errors`);
    } catch (error) {
      console.error("[Firecrawl] Scraping job failed:", error);
      
      await storage.updateScrapingJob(jobId, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error occurred",
        completedAt: new Date(),
      });
    }
  }

  private extractDomain(input?: string): string | undefined {
    if (!input) return undefined;
    
    try {
      if (input.includes("@")) {
        return input.split("@")[1];
      }
      
      const url = input.startsWith("http") ? input : `https://${input}`;
      const urlObj = new URL(url);
      return urlObj.hostname.replace("www.", "");
    } catch {
      return undefined;
    }
  }
}

export const firecrawlScraper = new FirecrawlScraper();
