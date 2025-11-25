/**
 * Hunter.io Enrichment Service
 * 
 * Provides functionality to:
 * - Find company domain from company name
 * - Find email addresses from a domain
 * - Verify email addresses
 * - Enrich prospect data automatically
 */

import { storage } from '../storage';

const HUNTER_API_BASE = 'https://api.hunter.io/v2';

interface HunterDomainSearchResponse {
  data: {
    domain: string;
    disposable: boolean;
    webmail: boolean;
    accept_all: boolean;
    pattern: string;
    organization: string;
    emails: Array<{
      value: string;
      type: string;
      confidence: number;
      first_name: string;
      last_name: string;
      position: string;
      seniority: string;
      department: string;
    }>;
  };
  meta: {
    results: number;
    limit: number;
    offset: number;
  };
}

interface HunterEmailFinderResponse {
  data: {
    first_name: string;
    last_name: string;
    email: string;
    score: number;
    domain: string;
    accept_all: boolean;
    position: string;
    company: string;
    sources: Array<{
      domain: string;
      uri: string;
    }>;
  };
}

interface HunterEmailVerifyResponse {
  data: {
    status: 'valid' | 'invalid' | 'accept_all' | 'webmail' | 'disposable' | 'unknown';
    result: 'deliverable' | 'undeliverable' | 'risky' | 'unknown';
    score: number;
    email: string;
    regexp: boolean;
    gibberish: boolean;
    disposable: boolean;
    webmail: boolean;
    mx_records: boolean;
    smtp_server: boolean;
    smtp_check: boolean;
    accept_all: boolean;
    block: boolean;
  };
}

interface HunterAccountResponse {
  data: {
    email: string;
    plan_name: string;
    plan_level: number;
    reset_date: string;
    calls: {
      used: number;
      available: number;
    };
    requests: {
      searches: { used: number; available: number };
      verifications: { used: number; available: number };
    };
  };
}

interface EnrichmentResult {
  success: boolean;
  prospectId: string;
  domain?: string;
  email?: string;
  emailConfidence?: number;
  verified?: boolean;
  error?: string;
}

class HunterEnrichmentService {
  private apiKey: string | null = null;

  private getApiKey(): string {
    if (!this.apiKey) {
      this.apiKey = process.env.HUNTER_API_KEY || null;
    }
    if (!this.apiKey) {
      throw new Error('HUNTER_API_KEY not configured. Please add your Hunter.io API key.');
    }
    return this.apiKey;
  }

  /**
   * Check if Hunter.io is configured and get account info
   */
  async checkConnection(): Promise<{ success: boolean; account?: HunterAccountResponse['data']; error?: string }> {
    try {
      const apiKey = this.getApiKey();
      const response = await fetch(`${HUNTER_API_BASE}/account?api_key=${apiKey}`);
      
      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.errors?.[0]?.details || 'Invalid API key' };
      }

      const data: HunterAccountResponse = await response.json();
      return { success: true, account: data.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean company name to derive potential domain
   */
  private cleanCompanyNameForDomain(companyName: string): string {
    return companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .replace(/\s+/g, '') // Remove spaces
      .trim();
  }

  /**
   * Try to find domain from company name using various TLDs
   */
  async findDomainFromCompanyName(companyName: string): Promise<string | null> {
    const cleanName = this.cleanCompanyNameForDomain(companyName);
    const tldsToTry = ['.fr', '.com', '.eu', '.io', '.net'];
    
    for (const tld of tldsToTry) {
      const potentialDomain = cleanName + tld;
      try {
        // Use Hunter's email-count endpoint (free) to check if domain has emails
        const apiKey = this.getApiKey();
        const response = await fetch(
          `${HUNTER_API_BASE}/email-count?domain=${potentialDomain}&api_key=${apiKey}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.total > 0) {
            console.log(`[Hunter] Found valid domain: ${potentialDomain} (${data.data.total} emails)`);
            return potentialDomain;
          }
        }
      } catch (error) {
        // Continue to next TLD
      }
    }
    
    return null;
  }

  /**
   * Search for emails associated with a domain
   */
  async searchDomain(domain: string, limit: number = 10): Promise<HunterDomainSearchResponse['data'] | null> {
    try {
      const apiKey = this.getApiKey();
      const response = await fetch(
        `${HUNTER_API_BASE}/domain-search?domain=${domain}&limit=${limit}&api_key=${apiKey}`
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('[Hunter] Domain search error:', error);
        return null;
      }

      const data: HunterDomainSearchResponse = await response.json();
      return data.data;
    } catch (error) {
      console.error('[Hunter] Domain search error:', error);
      return null;
    }
  }

  /**
   * Find a specific person's email
   */
  async findEmail(domain: string, firstName?: string, lastName?: string): Promise<HunterEmailFinderResponse['data'] | null> {
    try {
      const apiKey = this.getApiKey();
      let url = `${HUNTER_API_BASE}/email-finder?domain=${domain}&api_key=${apiKey}`;
      
      if (firstName) url += `&first_name=${encodeURIComponent(firstName)}`;
      if (lastName) url += `&last_name=${encodeURIComponent(lastName)}`;

      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data: HunterEmailFinderResponse = await response.json();
      return data.data;
    } catch (error) {
      console.error('[Hunter] Email finder error:', error);
      return null;
    }
  }

  /**
   * Verify an email address
   */
  async verifyEmail(email: string): Promise<HunterEmailVerifyResponse['data'] | null> {
    try {
      const apiKey = this.getApiKey();
      const response = await fetch(
        `${HUNTER_API_BASE}/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`
      );

      if (!response.ok) {
        return null;
      }

      const data: HunterEmailVerifyResponse = await response.json();
      return data.data;
    } catch (error) {
      console.error('[Hunter] Email verify error:', error);
      return null;
    }
  }

  /**
   * Enrich a single prospect with domain and email
   */
  async enrichProspect(prospectId: string): Promise<EnrichmentResult> {
    try {
      const prospect = await storage.getProspect(prospectId);
      if (!prospect) {
        return { success: false, prospectId, error: 'Prospect not found' };
      }

      let domain: string | null | undefined = prospect.domain;
      let email: string | null | undefined = prospect.email;
      let emailConfidence = 0;

      // Step 1: Find domain if missing
      if (!domain && prospect.companyName) {
        console.log(`[Hunter] Finding domain for: ${prospect.companyName}`);
        domain = await this.findDomainFromCompanyName(prospect.companyName);
        
        if (domain) {
          await storage.updateProspect(prospectId, { domain });
        }
      }

      // Step 2: Find email if we have a domain
      if (domain && !email) {
        console.log(`[Hunter] Searching emails for domain: ${domain}`);
        const domainData = await this.searchDomain(domain, 5);
        
        if (domainData && domainData.emails && domainData.emails.length > 0) {
          // Prefer generic emails (contact@, info@) or highest confidence
          const genericEmail = domainData.emails.find(e => e.type === 'generic');
          const bestEmail = genericEmail || domainData.emails.sort((a, b) => b.confidence - a.confidence)[0];
          
          email = bestEmail.value;
          emailConfidence = bestEmail.confidence;
          
          await storage.updateProspect(prospectId, { 
            email,
            status: 'qualified' // Mark as qualified since we found an email
          });
        }
      }

      // Step 3: Verify existing email if present
      let verified = false;
      if (email) {
        const verification = await this.verifyEmail(email);
        if (verification) {
          verified = verification.result === 'deliverable';
          if (!verified && verification.result === 'undeliverable') {
            // Clear invalid email - set to empty string which will be treated as no email
            await storage.updateProspect(prospectId, { email: '' });
            email = undefined;
          }
        }
      }

      return {
        success: !!(domain || email),
        prospectId,
        domain: domain || undefined,
        email: email || undefined,
        emailConfidence,
        verified
      };
    } catch (error: any) {
      return { success: false, prospectId, error: error.message };
    }
  }

  /**
   * Enrich all prospects that don't have email addresses
   */
  async enrichAllProspects(options: { 
    onlyWithoutEmail?: boolean;
    limit?: number;
    delayMs?: number;
  } = {}): Promise<{ 
    total: number; 
    enriched: number; 
    failed: number;
    results: EnrichmentResult[];
  }> {
    const { onlyWithoutEmail = true, limit = 50, delayMs = 1000 } = options;
    
    let prospects = await storage.getProspects();
    
    if (onlyWithoutEmail) {
      prospects = prospects.filter(p => !p.email || !p.email.includes('@'));
    }
    
    if (limit) {
      prospects = prospects.slice(0, limit);
    }

    const results: EnrichmentResult[] = [];
    let enriched = 0;
    let failed = 0;

    for (const prospect of prospects) {
      const result = await this.enrichProspect(prospect.id);
      results.push(result);
      
      if (result.success) {
        enriched++;
      } else {
        failed++;
      }

      // Rate limiting
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return {
      total: prospects.length,
      enriched,
      failed,
      results
    };
  }

  /**
   * Get email pattern for a domain (generic emails like contact@, info@)
   */
  async getGenericEmails(domain: string): Promise<string[]> {
    const commonPatterns = ['contact', 'info', 'hello', 'commercial', 'sales', 'bonjour'];
    const emails: string[] = [];

    for (const pattern of commonPatterns) {
      const email = `${pattern}@${domain}`;
      const verification = await this.verifyEmail(email);
      
      if (verification && verification.result === 'deliverable') {
        emails.push(email);
      }
      
      // Small delay between verifications
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return emails;
  }
}

export const hunterService = new HunterEnrichmentService();
