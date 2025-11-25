import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Search, Filter, Sparkles, CheckCircle, AlertCircle, Loader2, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Prospect } from "@shared/schema";

export default function Prospects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: prospects, isLoading } = useQuery<Prospect[]>({
    queryKey: ["/api/prospects", searchTerm, regionFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (regionFilter && regionFilter !== "all") params.append("region", regionFilter);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      
      const url = `/api/prospects${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch prospects");
      return response.json();
    },
  });

  const { data: hunterStatus } = useQuery<{ success: boolean; account?: any; error?: string }>({
    queryKey: ["/api/enrichment/status"],
  });

  // Helper to check if a prospect has a valid email (not null, undefined, empty, or invalid)
  const hasValidEmail = (email: string | null | undefined) => {
    return email && email.trim() !== '' && email.includes('@');
  };
  
  const prospectsWithoutEmail = prospects?.filter(p => !hasValidEmail(p.email)) || [];
  const prospectsWithEmail = prospects?.filter(p => hasValidEmail(p.email)) || [];

  const enrichAllMutation = useMutation({
    mutationFn: (limit: number) => apiRequest("POST", "/api/enrichment/all", { limit }),
    onSuccess: (data: any) => {
      toast({
        title: "Enrichissement lancé",
        description: data.message || `Enrichissement de ${data.total} prospects en cours...`,
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      }, 5000);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de lancer l'enrichissement. Vérifiez votre clé Hunter.io.",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    window.location.href = "/api/prospects/export";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "contacted":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "qualified":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Prospects</h1>
          <p className="text-muted-foreground">
            Gérez votre base de données de prospects
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {prospectsWithoutEmail.length > 0 && hunterStatus?.success && (
            <Button
              variant="outline"
              onClick={() => enrichAllMutation.mutate(prospectsWithoutEmail.length)}
              disabled={enrichAllMutation.isPending}
              data-testid="button-enrich-all"
            >
              {enrichAllMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enrichissement...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Enrichir ({prospectsWithoutEmail.length})
                </>
              )}
            </Button>
          )}
          <Button onClick={handleExport} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {hunterStatus && (
        <Alert className={`mb-6 ${hunterStatus.success ? 'border-green-500/50' : 'border-yellow-500/50'}`}>
          {hunterStatus.success ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          )}
          <AlertTitle>
            {hunterStatus.success ? "Hunter.io connecté" : "Hunter.io non configuré"}
          </AlertTitle>
          <AlertDescription>
            {hunterStatus.success 
              ? `Crédits disponibles: ${hunterStatus.account?.calls?.available || 0} recherches`
              : "Ajoutez HUNTER_API_KEY pour enrichir automatiquement les prospects (domaine + email)"}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Prospects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="stat-total-prospects">
              {prospects?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Avec Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600" data-testid="stat-with-email">
              {prospectsWithEmail.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Sans Email (à enrichir)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-orange-600" data-testid="stat-without-email">
              {prospectsWithoutEmail.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email, domaine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger data-testid="select-region">
              <SelectValue placeholder="Toutes les régions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les régions</SelectItem>
              <SelectItem value="ile-de-france">Île-de-France</SelectItem>
              <SelectItem value="auvergne-rhone-alpes">
                Auvergne-Rhône-Alpes
              </SelectItem>
              <SelectItem value="provence-alpes-cote-azur">
                Provence-Alpes-Côte d'Azur
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="select-status">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="new">Nouveau</SelectItem>
              <SelectItem value="contacted">Contacté</SelectItem>
              <SelectItem value="qualified">Qualifié</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entreprise</TableHead>
              <TableHead>Domaine</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Région</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5)
                .fill(0)
                .map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  </TableRow>
                ))
            ) : prospects && prospects.length > 0 ? (
              prospects.map((prospect) => (
                <TableRow key={prospect.id}>
                  <TableCell className="font-medium">
                    {prospect.companyName}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {prospect.domain || (
                      <span className="text-orange-500">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {hasValidEmail(prospect.email) ? (
                      <span className="text-green-600 dark:text-green-400">{prospect.email}</span>
                    ) : (
                      <span className="text-orange-500">Manquant</span>
                    )}
                  </TableCell>
                  <TableCell>{prospect.region || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{prospect.source}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(prospect.status)}>
                      {prospect.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(prospect.scrapedAt).toLocaleDateString("fr-FR")}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Filter className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground" data-testid="text-no-prospects">
                      Aucun prospect trouvé
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Lancez un scraping pour ajouter des prospects
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
