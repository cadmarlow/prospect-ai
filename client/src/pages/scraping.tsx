import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Play, Database, Loader2, Settings2, Globe, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { insertScrapingJobSchema, type ScrapingJob } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const extendedFormSchema = insertScrapingJobSchema.extend({
  keywords: z.string().optional(),
  maxResults: z.number().min(1).max(100).optional(),
  customUrl: z.string().url().optional().or(z.literal("")),
});

type FormData = z.infer<typeof extendedFormSchema>;

export default function Scraping() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const { toast } = useToast();

  const { data: jobs, isLoading } = useQuery<ScrapingJob[]>({
    queryKey: ["/api/scraping/jobs"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(extendedFormSchema),
    defaultValues: {
      source: "pagesjaunes",
      region: "",
      activityType: "immobilier-entreprise",
      status: "pending",
      keywords: "",
      maxResults: 20,
      customUrl: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        customUrl: data.customUrl || undefined,
        keywords: data.keywords || undefined,
      };
      return apiRequest("POST", "/api/scraping/start", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scraping/jobs"] });
      setIsDialogOpen(false);
      form.reset();
      setUseCustomUrl(false);
      toast({
        title: "Scraping IA lancé",
        description: "Firecrawl analyse les pages et extrait les données avec l'IA. Cela peut prendre quelques minutes.",
      });
    },
    onError: (error: any) => {
      const message = error?.message?.includes("FIRECRAWL_API_KEY") 
        ? "Clé API Firecrawl non configurée. Ajoutez-la dans les Secrets."
        : "Une erreur est survenue lors du lancement du scraping.";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
      running: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      completed: "bg-green-500/10 text-green-700 dark:text-green-400",
      failed: "bg-red-500/10 text-red-700 dark:text-red-400",
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: "En attente",
      running: "En cours",
      completed: "Terminé",
      failed: "Échoué",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      pagesjaunes: "Pages Jaunes",
      cci: "CCI France",
      linkedin: "LinkedIn",
      custom: "URL Personnalisée",
    };
    return labels[source] || source;
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Scraping Web IA</h1>
          <p className="text-muted-foreground">
            Collectez automatiquement des prospects avec Firecrawl et l'intelligence artificielle
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-start-scraping">
              <Zap className="h-4 w-4 mr-2" />
              Nouveau Scraping IA
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Lancer un scraping intelligent</DialogTitle>
              <DialogDescription>
                Firecrawl analyse les pages web et l'IA extrait automatiquement les informations des entreprises.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex items-center space-x-2 py-2">
                  <Switch
                    id="custom-url-mode"
                    checked={useCustomUrl}
                    onCheckedChange={setUseCustomUrl}
                    data-testid="switch-custom-url"
                  />
                  <Label htmlFor="custom-url-mode">Utiliser une URL personnalisée</Label>
                </div>

                {useCustomUrl ? (
                  <FormField
                    control={form.control}
                    name="customUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL à scraper</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://www.exemple.com/annuaire"
                            {...field}
                            data-testid="input-custom-url"
                          />
                        </FormControl>
                        <FormDescription>
                          L'IA analysera cette page et ses sous-pages pour extraire les entreprises
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-source">
                              <SelectValue placeholder="Sélectionner une source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pagesjaunes">
                              Pages Jaunes
                            </SelectItem>
                            <SelectItem value="cci">CCI France</SelectItem>
                            <SelectItem value="linkedin">LinkedIn (via Google)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Région cible</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-region">
                            <SelectValue placeholder="Sélectionner une région" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ile-de-france">
                            Île-de-France
                          </SelectItem>
                          <SelectItem value="auvergne-rhone-alpes">
                            Auvergne-Rhône-Alpes
                          </SelectItem>
                          <SelectItem value="provence-alpes-cote-azur">
                            Provence-Alpes-Côte d'Azur
                          </SelectItem>
                          <SelectItem value="occitanie">Occitanie</SelectItem>
                          <SelectItem value="nouvelle-aquitaine">
                            Nouvelle-Aquitaine
                          </SelectItem>
                          <SelectItem value="bretagne">Bretagne</SelectItem>
                          <SelectItem value="normandie">Normandie</SelectItem>
                          <SelectItem value="hauts-de-france">Hauts-de-France</SelectItem>
                          <SelectItem value="grand-est">Grand Est</SelectItem>
                          <SelectItem value="pays-de-la-loire">Pays de la Loire</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="activityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type d'activité</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-activity">
                            <SelectValue placeholder="Sélectionner une activité" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="immobilier-entreprise">
                            Immobilier d'entreprise
                          </SelectItem>
                          <SelectItem value="promotion-immobiliere">
                            Promotion immobilière
                          </SelectItem>
                          <SelectItem value="gestion-patrimoine">
                            Gestion de patrimoine
                          </SelectItem>
                          <SelectItem value="agence-immobiliere">
                            Agence immobilière
                          </SelectItem>
                          <SelectItem value="investissement">
                            Investissement immobilier
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="advanced">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        Options avancées
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <FormField
                        control={form.control}
                        name="keywords"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mots-clés personnalisés</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="bureaux, entrepôts, locaux commerciaux..."
                                {...field}
                                data-testid="input-keywords"
                              />
                            </FormControl>
                            <FormDescription>
                              Ajoutez des mots-clés pour affiner la recherche
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxResults"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre maximum de résultats: {field.value}</FormLabel>
                            <FormControl>
                              <Slider
                                min={5}
                                max={100}
                                step={5}
                                value={[field.value || 20]}
                                onValueChange={(value) => field.onChange(value[0])}
                                data-testid="slider-max-results"
                              />
                            </FormControl>
                            <FormDescription>
                              Limite le nombre de prospects à extraire (5-100)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-launch-scraping"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Lancement...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Lancer le scraping IA
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Comment ça fonctionne ?</CardTitle>
          <CardDescription>
            Notre système utilise Firecrawl + GPT-4 pour extraire intelligemment les données
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Globe className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">1. Crawl intelligent</h4>
                <p className="text-sm text-muted-foreground">
                  Firecrawl navigue sur les sites, gère les CAPTCHAs et extrait le contenu
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Zap className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">2. Analyse IA</h4>
                <p className="text-sm text-muted-foreground">
                  GPT-4 analyse le contenu et identifie les entreprises pertinentes
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Database className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">3. Données structurées</h4>
                <p className="text-sm text-muted-foreground">
                  Nom, email, téléphone, adresse... extraits et sauvegardés
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Historique des scraping</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Région</TableHead>
                <TableHead>Type d'activité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Trouvés</TableHead>
                <TableHead>Sauvegardés</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-36" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    </TableRow>
                  ))
              ) : jobs && jobs.length > 0 ? (
                jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      {getSourceLabel(job.source)}
                    </TableCell>
                    <TableCell>{job.region || "-"}</TableCell>
                    <TableCell>{job.activityType || "-"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(job.status)}>
                        {getStatusLabel(job.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{job.totalFound || 0}</TableCell>
                    <TableCell>{job.successCount || 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(job.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Database className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground" data-testid="text-no-jobs">
                        Aucun job de scraping pour le moment
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Lancez votre premier scraping IA pour collecter des prospects
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
