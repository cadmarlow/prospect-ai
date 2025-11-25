import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Mail, Play, Pause, Trash2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
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
import { insertCampaignSchema, type Campaign, type EmailTemplate } from "@shared/schema";
import type { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
  });

  const launchMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/campaigns/${id}/launch`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campagne lancée",
        description: "La campagne d'emails a été lancée.",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
      active: "bg-green-500/10 text-green-700 dark:text-green-400",
      paused: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
      completed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      draft: "Brouillon",
      active: "Active",
      paused: "En pause",
      completed: "Terminée",
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Campagnes</h1>
          <p className="text-muted-foreground">
            Créez et gérez vos campagnes d'emails
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
                        defaultValue={field.value}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
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
                  <Badge className={`mt-2 ${getStatusBadge(campaign.status)}`}>
                    {getStatusLabel(campaign.status)}
                  </Badge>
                </div>
                <Mail className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-2xl font-semibold">
                        {campaign.sentCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Envoyés</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">
                        {campaign.openedCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Ouverts</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">
                        {campaign.clickedCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Clics</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    {campaign.status === "draft" && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => launchMutation.mutate(campaign.id)}
                        disabled={launchMutation.isPending}
                        data-testid={`button-launch-${campaign.id}`}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Lancer
                      </Button>
                    )}
                    {campaign.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        data-testid={`button-pause-${campaign.id}`}
                      >
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </Button>
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
