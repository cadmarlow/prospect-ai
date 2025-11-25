import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Settings as SettingsIcon, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Key,
  Mail,
  Zap,
  Search,
  Bot,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface ServiceStatus {
  id: string;
  name: string;
  description: string;
  status: "connected" | "not_configured" | "error";
  configured: boolean;
  secretName?: string;
  docsUrl?: string;
  quota?: {
    searches?: number;
    verifications?: number;
  };
  fromEmail?: string;
  isReplitConnector?: boolean;
  note?: string;
}

interface ServicesResponse {
  services: ServiceStatus[];
}

const serviceIcons: Record<string, typeof SettingsIcon> = {
  firecrawl: Zap,
  hunter: Search,
  openai: Bot,
  resend: Mail,
};

function ServiceCard({ service }: { service: ServiceStatus }) {
  const Icon = serviceIcons[service.id] || SettingsIcon;
  
  const statusConfig = {
    connected: {
      badge: "Connecté",
      variant: "default" as const,
      icon: CheckCircle,
      iconColor: "text-green-500",
    },
    not_configured: {
      badge: "Non configuré",
      variant: "secondary" as const,
      icon: XCircle,
      iconColor: "text-muted-foreground",
    },
    error: {
      badge: "Erreur",
      variant: "destructive" as const,
      icon: AlertCircle,
      iconColor: "text-destructive",
    },
  };

  const config = statusConfig[service.status];
  const StatusIcon = config.icon;

  return (
    <Card data-testid={`card-service-${service.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{service.name}</CardTitle>
              <CardDescription className="text-sm">
                {service.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${config.iconColor}`} />
            <Badge variant={config.variant} data-testid={`badge-status-${service.id}`}>
              {config.badge}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {service.fromEmail && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Email d'envoi:</span>
            <code className="bg-muted px-2 py-0.5 rounded text-xs">
              {service.fromEmail}
            </code>
          </div>
        )}

        {service.quota && (
          <div className="flex flex-wrap gap-4 text-sm">
            {service.quota.searches !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Recherches restantes:</span>
                <Badge variant="outline">{service.quota.searches}</Badge>
              </div>
            )}
            {service.quota.verifications !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Vérifications restantes:</span>
                <Badge variant="outline">{service.quota.verifications}</Badge>
              </div>
            )}
          </div>
        )}

        {service.note && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{service.note}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Key className="h-4 w-4" />
            {service.isReplitConnector ? (
              <span>Géré par connecteur Replit</span>
            ) : (
              <span>
                Secret: <code className="bg-muted px-1 rounded">{service.secretName}</code>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {!service.isReplitConnector && !service.configured && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      window.open("https://replit.com/replspace/secrets", "_blank");
                    }}
                    data-testid={`button-configure-${service.id}`}
                  >
                    <Key className="h-4 w-4 mr-1" />
                    Configurer
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ouvrir les Secrets Replit pour ajouter {service.secretName}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {service.docsUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(service.docsUrl, "_blank")}
                data-testid={`button-docs-${service.id}`}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Docs
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { data, isLoading, error } = useQuery<ServicesResponse>({
    queryKey: ["/api/settings/services"],
  });

  const connectedCount = data?.services.filter(s => s.status === "connected").length || 0;
  const totalCount = data?.services.length || 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez vos services tiers et intégrations
        </p>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Gestion des clés API</AlertTitle>
        <AlertDescription>
          Les clés API sont stockées de manière sécurisée dans les <strong>Secrets Replit</strong>. 
          Pour les modifier, utilisez le panneau Secrets dans l'onglet "Tools" de Replit, 
          ou cliquez sur le bouton "Configurer" d'un service non configuré.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            Impossible de charger le statut des services.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="mb-6 flex items-center gap-2">
            <Badge variant={connectedCount === totalCount ? "default" : "secondary"}>
              {connectedCount}/{totalCount} services connectés
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {data?.services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Comment configurer les services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <strong className="text-foreground">Firecrawl</strong> - Obtenez une clé API sur{" "}
            <a href="https://firecrawl.dev" target="_blank" rel="noopener" className="text-primary underline">
              firecrawl.dev
            </a>
            . Plan gratuit: 500 crédits.
          </div>
          <div>
            <strong className="text-foreground">Hunter.io</strong> - Créez un compte sur{" "}
            <a href="https://hunter.io" target="_blank" rel="noopener" className="text-primary underline">
              hunter.io
            </a>
            . Plan gratuit: 50 recherches + 100 vérifications/mois.
          </div>
          <div>
            <strong className="text-foreground">OpenAI</strong> - Obtenez une clé API sur{" "}
            <a href="https://platform.openai.com" target="_blank" rel="noopener" className="text-primary underline">
              platform.openai.com
            </a>
            . Utilisation payante.
          </div>
          <div>
            <strong className="text-foreground">Resend</strong> - Configuré automatiquement via le{" "}
            <strong>connecteur Replit</strong>. Pas besoin de SMTP ! L'email d'envoi est configuré dans le panneau Resend de Replit.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
