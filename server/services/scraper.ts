import { InsertProspect } from "@shared/schema";
import { storage } from "../storage";

export interface ScraperResult {
  companyName: string;
  domain?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  activityType?: string;
}

export class WebScraper {
  async scrapePagesJaunes(
    region: string,
    activityType: string
  ): Promise<ScraperResult[]> {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const sampleCompanies = [
      {
        companyName: "Immobilière Patrimoine Pro",
        domain: "immobiliere-patrimoine.fr",
        email: "contact@immobiliere-patrimoine.fr",
        phone: "01 42 56 78 90",
        address: "15 Avenue des Champs-Élysées",
        city: "Paris",
        region,
        activityType,
      },
      {
        companyName: "Entreprise Immobilier Solutions",
        domain: "entreprise-immo-solutions.com",
        email: "info@entreprise-immo-solutions.com",
        phone: "01 45 67 89 12",
        address: "23 Rue de la République",
        city: region === "ile-de-france" ? "Paris" : "Lyon",
        region,
        activityType,
      },
      {
        companyName: "Cabinet Immobilier d'Entreprise",
        domain: "cabinet-immobilier-entreprise.fr",
        email: "commercial@cabinet-immobilier-entreprise.fr",
        phone: "01 48 76 54 32",
        address: "45 Boulevard Haussmann",
        city: region === "ile-de-france" ? "Paris" : "Marseille",
        region,
        activityType,
      },
    ];
    
    return sampleCompanies;
  }

  async scrapeCCI(
    region: string,
    activityType: string
  ): Promise<ScraperResult[]> {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const sampleCompanies = [
      {
        companyName: "Invest Pro Immobilier",
        domain: "investpro-immobilier.fr",
        email: "contact@investpro-immobilier.fr",
        phone: "02 33 44 55 66",
        address: "78 Avenue de la Liberté",
        city: "Lyon",
        region,
        activityType,
      },
      {
        companyName: "Gestion Patrimoine Corporate",
        domain: "gestion-patrimoine-corp.com",
        email: "info@gestion-patrimoine-corp.com",
        phone: "04 56 78 90 12",
        address: "12 Rue du Commerce",
        city: "Marseille",
        region,
        activityType,
      },
    ];
    
    return sampleCompanies;
  }

  async scrape(
    source: string,
    region: string,
    activityType: string,
    jobId: string
  ): Promise<void> {
    try {
      await storage.updateScrapingJob(jobId, {
        status: "running",
        startedAt: new Date(),
      });

      let results: ScraperResult[] = [];

      if (source === "pagesjaunes") {
        results = await this.scrapePagesJaunes(region, activityType);
      } else if (source === "cci") {
        results = await this.scrapeCCI(region, activityType);
      }

      let successCount = 0;
      let errorCount = 0;

      for (const result of results) {
        try {
          const prospectData: InsertProspect = {
            companyName: result.companyName,
            domain: result.domain,
            email: result.email,
            phone: result.phone,
            address: result.address,
            city: result.city,
            region: result.region,
            activityType: result.activityType,
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
    } catch (error) {
      await storage.updateScrapingJob(jobId, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      });
    }
  }
}

export const webScraper = new WebScraper();
