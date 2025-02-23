import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Dumbbell, Calendar, ClipboardList, Scale, LayoutDashboard, Calculator, Play } from "lucide-react";
import { Sidebar as UISidebar, SidebarTrigger, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Begin Workout", href: "/begin-workout", icon: Play },
  { name: "Exercises", href: "/exercises", icon: Dumbbell },
  { name: "Workout Days", href: "/workout-days", icon: Calendar },
  { name: "Workout Log", href: "/workout-log", icon: ClipboardList },
  { name: "Weight Tracker", href: "/weight-tracker", icon: Scale },
  { name: "Future Workout", href: "/future-workout", icon: Calculator },
];

export default function Sidebar() {
  const [location] = useLocation();
  const isMobile = useIsMobile();

  return (
    <UISidebar>
      <SidebarHeader className="flex items-center h-16 px-6 border-b border-border">
        <h1 className="text-xl font-bold text-sidebar-foreground">Workout Tracker</h1>
        {!isMobile && <SidebarTrigger className="ml-auto" />}
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navigation.map((item) => (
            <SidebarMenuItem key={item.name}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={location === item.href}
                  tooltip={item.name}
                  className={cn(
                    "w-full",
                    location === item.href
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span>{item.name}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </UISidebar>
  );
}