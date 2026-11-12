import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bell, Building2, CalendarDays, ClipboardList, LayoutDashboard, LifeBuoy, TableProperties } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useStore } from "@/lib/store";
import { USERS } from "@/lib/seed";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Find a Room", url: "/rooms", icon: Building2 },
  { title: "Class Schedules", url: "/schedules", icon: TableProperties },
  { title: "Reservations", url: "/reservations", icon: ClipboardList },
  { title: "Calendar & News", url: "/calendar", icon: CalendarDays },
  { title: "Reports", url: "/reports", icon: LifeBuoy },
  { title: "Notifications", url: "/notifications", icon: Bell },
] as const;

function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand font-display text-sm font-bold text-primary-foreground">SS</div>
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <div className="font-display text-base font-semibold text-sidebar-foreground">CISC SpaceSync</div>
            <div className="text-xs text-sidebar-foreground/70">Rooms & Faculty Scheduling</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((n) => (
                <SidebarMenuItem key={n.url}>
                  <SidebarMenuButton asChild isActive={path === n.url} tooltip={n.title}>
                    <Link to={n.url}>
                      <n.icon className="h-4 w-4" />
                      <span>{n.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { role, setRole, notifications, me } = useStore();
  const unread = notifications.filter((n) => !n.read && (n.to === me || n.to === "all")).length;
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background bg-page">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="hidden text-sm text-muted-foreground sm:block">Thursday, Nov 12, 2026</div>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex rounded-full border border-border bg-muted p-1 text-xs font-medium" role="radiogroup" aria-label="Demo role">
                {(["student", "faculty", "admin"] as Role[]).map((r) => (
                  <button key={r} role="radio" aria-checked={role === r} onClick={() => setRole(r)} className={cn("rounded-full px-3 py-1.5 capitalize transition", role === r ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
                    {r}
                  </button>
                ))}
              </div>
              <Link to="/notifications" className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-card" aria-label={`${unread} unread notifications`}>
                <Bell className="h-4 w-4" />
                {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">{unread}</span>}
              </Link>
              <div className="hidden items-center gap-2 md:flex">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-brand text-xs font-bold text-primary-foreground">{me.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
                <div className="leading-tight">
                  <div className="text-sm font-medium">{me}</div>
                  <div className="text-xs text-muted-foreground">{USERS[role].detail}</div>
                </div>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
