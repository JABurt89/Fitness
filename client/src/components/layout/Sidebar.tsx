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
    <>
      {/* Top Navigation Bar for Mobile */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border bg-background px-4 py-2">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-10 w-10" />
            <span className="font-medium">Menu</span>
          </div>
        </div>
      )}

      <UISidebar 
        variant="floating"
        collapsible={isMobile ? "offcanvas" : "icon"}
        className={cn(
          "border-r border-border bg-background",
          "fixed left-0 top-0 bottom-0 md:sticky md:top-0",
          "z-40 flex h-screen",
          isMobile ? "w-[280px]" : "w-[240px]",
          "transition-all duration-300 ease-in-out"
        )}
      >
        <SidebarHeader className={cn(
          "flex items-center h-16 px-4 border-b border-border",
          isMobile && "mt-14" // Add margin-top when mobile to account for top nav
        )}>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">Workout Tracker</h1>
          </div>
          {!isMobile && <SidebarTrigger className="ml-2 shrink-0" />}
        </SidebarHeader>
        <SidebarContent className="flex-1 overflow-y-auto bg-background">
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
    </>
  );
}