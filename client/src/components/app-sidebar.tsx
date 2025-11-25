import {
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  Database,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    testId: "link-dashboard",
  },
  {
    title: "Prospects",
    url: "/prospects",
    icon: Users,
    testId: "link-prospects",
  },
  {
    title: "Campagnes",
    url: "/campaigns",
    icon: Mail,
    testId: "link-campaigns",
  },
  {
    title: "Templates",
    url: "/templates",
    icon: FileText,
    testId: "link-templates",
  },
  {
    title: "Scraping",
    url: "/scraping",
    icon: Database,
    testId: "link-scraping",
  },
  {
    title: "Paramètres",
    url: "/settings",
    icon: Settings,
    testId: "link-settings",
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <div className="px-4 py-6">
            <h2 className="text-xl font-semibold">ProspectAI</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Outil de prospection
            </p>
          </div>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url} data-testid={item.testId}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
