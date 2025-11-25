import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Trash2, Edit, Sparkles, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertEmailTemplateSchema, type EmailTemplate } from "@shared/schema";
import type { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type FormData = z.infer<typeof insertEmailTemplateSchema>;

interface AIGenerationParams {
  industry: string;
  purpose: string;
  tone: string;
  companyType: string;
}

export default function Templates() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [aiParams, setAiParams] = useState<AIGenerationParams>({
    industry: "immobilier",
    purpose: "prospection",
    tone: "professionnel",
    companyType: "PME",
  });
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(insertEmailTemplateSchema),
    defaultValues: {
      name: "",
      subject: "",
      body: "",
      category: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest("POST", "/api/templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Template créé",
        description: "Le template d'email a été créé avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création du template.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/templates/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template supprimé",
        description: "Le template a été supprimé avec succès.",
      });
    },
  });

  const generateAIMutation = useMutation({
    mutationFn: (params: AIGenerationParams) =>
      apiRequest("POST", "/api/templates/generate", params),
    onSuccess: async (response: any) => {
      const template = response.template;
      if (template) {
        form.setValue("name", template.name || "");
        form.setValue("subject", template.subject || "");
        form.setValue("body", template.body || "");
        form.setValue("category", template.category || "");
        
        setIsAIDialogOpen(false);
        setIsDialogOpen(true);
        
        toast({
          title: "Template généré",
          description: response.note || "Le template a été généré par l'IA. Vous pouvez le modifier avant de sauvegarder.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la génération du template.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const handleAIGenerate = () => {
    generateAIMutation.mutate(aiParams);
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Templates d'Emails</h1>
          <p className="text-muted-foreground">
            Créez et gérez vos templates de prospection
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-generate-ai-template">
                <Sparkles className="h-4 w-4 mr-2" />
                Générer avec IA
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Générer un template avec l'IA</DialogTitle>
                <DialogDescription>
                  Décrivez le type de template que vous souhaitez et l'IA le créera pour vous.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Secteur d'activité</label>
                  <Select 
                    value={aiParams.industry} 
                    onValueChange={(v) => setAiParams(p => ({ ...p, industry: v }))}
                  >
                    <SelectTrigger data-testid="select-ai-industry">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immobilier">Immobilier</SelectItem>
                      <SelectItem value="immobilier-entreprise">Immobilier d'entreprise</SelectItem>
                      <SelectItem value="construction">Construction / BTP</SelectItem>
                      <SelectItem value="promotion-immobiliere">Promotion immobilière</SelectItem>
                      <SelectItem value="gestion-patrimoine">Gestion de patrimoine</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Objectif de l'email</label>
                  <Select 
                    value={aiParams.purpose} 
                    onValueChange={(v) => setAiParams(p => ({ ...p, purpose: v }))}
                  >
                    <SelectTrigger data-testid="select-ai-purpose">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospection">Première prise de contact</SelectItem>
                      <SelectItem value="relance">Relance après premier contact</SelectItem>
                      <SelectItem value="presentation">Présentation de services</SelectItem>
                      <SelectItem value="partenariat">Proposition de partenariat</SelectItem>
                      <SelectItem value="suivi">Suivi de relation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type d'entreprise cible</label>
                  <Select 
                    value={aiParams.companyType} 
                    onValueChange={(v) => setAiParams(p => ({ ...p, companyType: v }))}
                  >
                    <SelectTrigger data-testid="select-ai-company-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PME">PME / TPE</SelectItem>
                      <SelectItem value="grand-compte">Grands comptes</SelectItem>
                      <SelectItem value="startup">Startups</SelectItem>
                      <SelectItem value="agence">Agences immobilières</SelectItem>
                      <SelectItem value="promoteur">Promoteurs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ton souhaité</label>
                  <Select 
                    value={aiParams.tone} 
                    onValueChange={(v) => setAiParams(p => ({ ...p, tone: v }))}
                  >
                    <SelectTrigger data-testid="select-ai-tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professionnel">Professionnel</SelectItem>
                      <SelectItem value="amical">Amical et décontracté</SelectItem>
                      <SelectItem value="formel">Formel</SelectItem>
                      <SelectItem value="direct">Direct et concis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleAIGenerate} 
                  disabled={generateAIMutation.isPending}
                  data-testid="button-generate-template"
                >
                  {generateAIMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Générer
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-template">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer un nouveau template</DialogTitle>
                <DialogDescription>
                  Créez un template d'email réutilisable pour vos campagnes.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du template</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Première approche immobilier"
                            {...field}
                            data-testid="input-template-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catégorie (optionnel)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Prospection initiale"
                            {...field}
                            value={field.value ?? ""}
                            data-testid="input-template-category"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Objet de l'email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Collaboration pour vos projets immobiliers"
                            {...field}
                            data-testid="input-template-subject"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Corps de l'email</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Bonjour {{companyName}},&#10;&#10;Je me permets de vous contacter..."
                            className="min-h-[200px]"
                            {...field}
                            data-testid="input-template-body"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          Utilisez {`{{companyName}}`}, {`{{domain}}`}, {`{{region}}`}{" "}
                          pour personnaliser
                        </p>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-save-template"
                    >
                      {createMutation.isPending ? "Création..." : "Créer"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
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
        ) : templates && templates.length > 0 ? (
          templates.map((template) => (
            <Card key={template.id} className="hover-elevate">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {template.category && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.category}
                    </p>
                  )}
                </div>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Objet:
                    </p>
                    <p className="text-sm font-medium line-clamp-2">
                      {template.subject}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Aperçu:
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {template.body}
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      data-testid={`button-edit-${template.id}`}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(template.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${template.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4" data-testid="text-no-templates">
                Aucun template créé pour le moment
              </p>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-template">
                <Plus className="h-4 w-4 mr-2" />
                Créer votre premier template
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
