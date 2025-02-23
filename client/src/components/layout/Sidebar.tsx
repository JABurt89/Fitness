import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Dumbbell, Calendar, ClipboardList, Scale, LayoutDashboard, Calculator, Play } from "lucide-react";
import { 
  Sidebar as UISidebar, 
  SidebarTrigger, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
} from "@/components/ui/sidebar";
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
    <UISidebar 
      variant="sidebar"
      collapsible={isMobile ? "offcanvas" : "icon"}
      className={cn(
        "border-r border-border",
        "fixed md:relative",
        "z-40"
      )}
    >
      <SidebarHeader className="flex items-center h-16 px-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">Workout Tracker</h1>
        </div>
        <SidebarTrigger className="ml-2 shrink-0" />
      </SidebarHeader>
      <SidebarContent className="h-[calc(100vh-4rem)]">
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
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground/80 hover:bg-accent/50 hover:text-accent-foreground",
                    "group-data-[collapsible=icon]:!p-2"
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">{item.name}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </UISidebar>
  );
}