import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Mail, TrendingUp, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<{
    totalProspects: number;
    totalEmailsSent: number;
    openRate: number;
    conversionRate: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const statCards = [
    {
      title: "Total Prospects",
      value: stats?.totalProspects || 0,
      icon: Users,
      testId: "stat-prospects",
    },
    {
      title: "Emails Envoyés",
      value: stats?.totalEmailsSent || 0,
      icon: Mail,
      testId: "stat-emails",
    },
    {
      title: "Taux d'Ouverture",
      value: `${stats?.openRate || 0}%`,
      icon: TrendingUp,
      testId: "stat-open-rate",
    },
    {
      title: "Taux de Conversion",
      value: `${stats?.conversionRate || 0}%`,
      icon: Target,
      testId: "stat-conversion",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de vos activités de prospection
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-semibold" data-testid={stat.testId}>
                  {stat.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Activités Récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <p data-testid="text-no-activity">Aucune activité récente pour le moment.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prochaines Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <ul className="space-y-2" data-testid="list-next-actions">
                <li>• Lancer une nouvelle campagne de scraping</li>
                <li>• Créer un template d'email personnalisé</li>
                <li>• Analyser les résultats de vos campagnes</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
