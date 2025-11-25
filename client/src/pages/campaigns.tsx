import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Mail, Play, Send, Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { insertCampaignSchema, type Campaign, type EmailTemplate, type Prospect } from "@shared/schema";
import type { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

type FormData = z.infer<typeof insertCampaignSchema>;

export default function Campaigns() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: templates } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const { data: prospects } = useQuery<Prospect[]>({
    queryKey: ["/api/prospects"],
  });

  const { data: emailStatus } = useQuery<{ success: boolean; fromEmail?: string; error?: string }>({
    queryKey: ["/api/email/test-connection"],
  });

  const prospectsWithEmail = prospects?.filter(p => p.email && p.email.includes('@')) || [];

  const form = useForm<FormData>({
    resolver: zodResolver(insertCampaignSchema),
    defaultValues: {
      name: "",
      templateId: "",
      status: "draft",
      recipientFilters: {},
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest("POST", "/api/campaigns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Campagne créée",
        description: "La campagne a été créée avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer la campagne.",
        variant: "destructive",
      });
    },
  });

  const launchMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/campaigns/${id}/launch`, {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Campagne lancée",
        description: `Les emails sont en cours d'envoi à ${data.recipients || 0} destinataires via Resend.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de lancer la campagne.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
      active: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      paused: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
      completed: "bg-green-500/10 text-green-700 dark:text-green-400",
      failed: "bg-red-500/10 text-red-700 dark:text-red-400",
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      draft: "Brouillon",
      active: "En cours",
      paused: "En pause",
      completed: "Terminée",
      failed: "Échouée",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "active": return <Loader2 className="h-4 w-4 animate-spin" />;
      case "failed": return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Campagnes d'Emails</h1>
          <p className="text-muted-foreground">
            Créez et gérez vos campagnes d'emails avec Resend
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-campaign">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Campagne
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une nouvelle campagne</DialogTitle>
              <DialogDescription>
                Configurez votre campagne d'emails de prospection.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de la campagne</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Prospection Île-de-France Q1"
                          {...field}
                          data-testid="input-campaign-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template d'email</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-template">
                            <SelectValue placeholder="Sélectionner un template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates?.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {templates?.length === 0 && "Créez d'abord un template dans l'onglet Templates"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="font-medium mb-1">Destinataires disponibles</p>
                  <p className="text-muted-foreground">
                    {prospectsWithEmail.length} prospect(s) avec email valide
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || !templates?.length}
                    data-testid="button-save-campaign"
                  >
                    {createMutation.isPending ? "Création..." : "Créer"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {emailStatus && (
        <Alert className={`mb-6 ${emailStatus.success ? 'border-green-500/50' : 'border-red-500/50'}`}>
          {emailStatus.success ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <AlertTitle>
            {emailStatus.success ? "Resend connecté" : "Resend non configuré"}
          </AlertTitle>
          <AlertDescription>
            {emailStatus.success 
              ? `Les emails seront envoyés depuis: ${emailStatus.fromEmail}`
              : emailStatus.error || "Configurez Resend pour envoyer des emails"}
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Comment fonctionne l'envoi ?</CardTitle>
          <CardDescription>
            Vos campagnes utilisent Resend + OpenAI pour des emails personnalisés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">1. Sélection du template</h4>
                <p className="text-sm text-muted-foreground">
                  Choisissez un template avec des variables comme {"{{companyName}}"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Send className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">2. Personnalisation IA</h4>
                <p className="text-sm text-muted-foreground">
                  GPT-4 personnalise chaque email selon le prospect
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">3. Envoi via Resend</h4>
                <p className="text-sm text-muted-foreground">
                  Emails envoyés avec throttling automatique (1/seconde)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(3)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))
        ) : campaigns && campaigns.length > 0 ? (
          campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover-elevate">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="flex-1">
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusIcon(campaign.status)}
                    <Badge className={getStatusBadge(campaign.status)}>
                      {getStatusLabel(campaign.status)}
                    </Badge>
                  </div>
                </div>
                <Mail className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-2xl font-semibold">
                        {campaign.totalRecipients || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Destinataires</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">
                        {campaign.sentCount || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Envoyés</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">
                        {campaign.openedCount || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Ouverts</p>
                    </div>
                  </div>
                  
                  {campaign.status === "completed" && campaign.sentCount && campaign.totalRecipients && (
                    <div className="pt-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${Math.round((campaign.sentCount / campaign.totalRecipients) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        {Math.round((campaign.sentCount / campaign.totalRecipients) * 100)}% envoyés
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {campaign.status === "draft" && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => launchMutation.mutate(campaign.id)}
                        disabled={launchMutation.isPending || !emailStatus?.success || prospectsWithEmail.length === 0}
                        data-testid={`button-launch-${campaign.id}`}
                      >
                        {launchMutation.isPending ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Lancement...
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Lancer ({prospectsWithEmail.length} emails)
                          </>
                        )}
                      </Button>
                    )}
                    {campaign.status === "active" && (
                      <div className="flex-1 text-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">Envoi en cours...</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4" data-testid="text-no-campaigns">
                Aucune campagne créée pour le moment
              </p>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-campaign">
                <Plus className="h-4 w-4 mr-2" />
                Créer votre première campagne
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
