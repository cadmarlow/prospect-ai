import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Database, Loader2 } from "lucide-react";
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
} from "@/components/ui/form";
import { insertScrapingJobSchema, type ScrapingJob } from "@shared/schema";
import type { z } from "zod";
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

type FormData = z.infer<typeof insertScrapingJobSchema>;

export default function Scraping() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: jobs, isLoading } = useQuery<ScrapingJob[]>({
    queryKey: ["/api/scraping/jobs"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(insertScrapingJobSchema),
    defaultValues: {
      source: "pagesjaunes",
      region: "",
      activityType: "immobilier-entreprise",
      status: "pending",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest("POST", "/api/scraping/start", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scraping/jobs"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Scraping lancé",
        description: "Le job de scraping a été lancé avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du lancement du scraping.",
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

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Scraping Web</h1>
          <p className="text-muted-foreground">
            Collectez automatiquement des prospects depuis diverses sources
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-start-scraping">
              <Play className="h-4 w-4 mr-2" />
              Nouveau Scraping
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lancer un nouveau scraping</DialogTitle>
              <DialogDescription>
                Configurez les paramètres de collecte de prospects.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Région</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
                        defaultValue={field.value}
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
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                        <Play className="h-4 w-4 mr-2" />
                        Lancer
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
                <TableHead>Succès</TableHead>
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
                    <TableCell className="font-medium capitalize">
                      {job.source}
                    </TableCell>
                    <TableCell>{job.region || "-"}</TableCell>
                    <TableCell>{job.activityType || "-"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(job.status)}>
                        {getStatusLabel(job.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{job.totalFound}</TableCell>
                    <TableCell>{job.successCount}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(job.createdAt).toLocaleDateString("fr-FR")}
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
