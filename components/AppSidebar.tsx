"use client";

import { LayoutDashboard, TrendingUp, TrendingDown, Wallet, Tag, Settings, FileSpreadsheet, Calculator, BookOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Receitas", url: "/receitas", icon: TrendingUp },
  { title: "Despesas", url: "/despesas", icon: TrendingDown },
  { title: "Contas", url: "/contas", icon: Wallet },
  { title: "Projeção de Caixa", url: "/projecao-caixa", icon: Calculator },
  { title: "Diário Cronológico", url: "/diario-cronologico", icon: BookOpen },
  { title: "Categorias", url: "/categorias", icon: Tag },
  { title: "Relatórios", url: "/relatorios", icon: FileSpreadsheet },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {open && <span className="text-lg font-bold gradient-text">FinPlan Pro</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    render={
                      <Link 
                        href={item.url}
                        className={pathname === item.url ? "bg-sidebar-accent" : ""}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    }
                    tooltip={item.title}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
