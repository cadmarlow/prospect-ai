import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface EmailGenerationParams {
  companyName: string;
  domain?: string;
  region?: string;
  activityType?: string;
  templateSubject: string;
  templateBody: string;
}

export class EmailGenerator {
  private hasOpenAI(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async generatePersonalizedEmail(params: EmailGenerationParams): Promise<{
    subject: string;
    body: string;
  }> {
    try {
      let subject = params.templateSubject;
      let body = params.templateBody;
      
      subject = subject
        .replace(/\{\{companyName\}\}/g, params.companyName)
        .replace(/\{\{domain\}\}/g, params.domain || "")
        .replace(/\{\{region\}\}/g, params.region || "");
      
      body = body
        .replace(/\{\{companyName\}\}/g, params.companyName)
        .replace(/\{\{domain\}\}/g, params.domain || "")
        .replace(/\{\{region\}\}/g, params.region || "");
      
      if (params.templateBody.includes("{{aiPersonalization}}") && this.hasOpenAI()) {
        const prompt = `Tu es un expert en prospection B2B pour une agence de développement spécialisée en immobilier d'entreprise.
        
Écris un paragraphe personnalisé (2-3 phrases maximum) pour l'entreprise "${params.companyName}" ${params.region ? `située en ${params.region}` : ""} ${params.activityType ? `spécialisée en ${params.activityType}` : ""}.

Le paragraphe doit :
- Être professionnel et engageant
- Mentionner un point spécifique lié à leur secteur d'activité
- Proposer de la valeur (solutions digitales, automatisation, etc.)
- Être concis et percutant

Ne pas inclure de formule de politesse (bonjour, cordialement, etc.)`;

        const response = await openai.chat.completions.create({
          model: "gpt-5",
          messages: [
            {
              role: "system",
              content: "Tu es un expert en prospection B2B. Réponds uniquement avec le paragraphe demandé, sans ajout.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_completion_tokens: 200,
        });

        const aiContent = response.choices[0].message.content || "";
        body = body.replace(/\{\{aiPersonalization\}\}/g, aiContent);
      }
      
      return { subject, body };
    } catch (error) {
      console.error("Error generating email with AI:", error);
      let subject = params.templateSubject;
      let body = params.templateBody;
      
      subject = subject
        .replace(/\{\{companyName\}\}/g, params.companyName)
        .replace(/\{\{domain\}\}/g, params.domain || "")
        .replace(/\{\{region\}\}/g, params.region || "")
        .replace(/\{\{aiPersonalization\}\}/g, "");
      
      body = body
        .replace(/\{\{companyName\}\}/g, params.companyName)
        .replace(/\{\{domain\}\}/g, params.domain || "")
        .replace(/\{\{region\}\}/g, params.region || "")
        .replace(/\{\{aiPersonalization\}\}/g, "Nous serions ravis de discuter de vos projets digitaux.");
      
      return { subject, body };
    }
  }
}

export const emailGenerator = new EmailGenerator();
